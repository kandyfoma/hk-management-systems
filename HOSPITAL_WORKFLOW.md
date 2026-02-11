# 🏥 Modern Hospital Management System — Full Patient Journey

> Documentation for HK Management Systems · Hospital Module  
> From patient arrival to discharge — complete workflow analysis  
> Updated: February 11, 2026

---

## Table of Contents

1. [Phase 1: Patient Arrival & Registration](#phase-1-patient-arrival--registration)
2. [Phase 2: Triage (Nurse Assessment)](#phase-2-triage-nurse-assessment)
3. [Phase 3: Doctor Consultation](#phase-3-doctor-consultation)
4. [Phase 4: Diagnostics (Lab & Imaging)](#phase-4-diagnostics-lab--imaging)
5. [Phase 5: Inpatient Admission](#phase-5-inpatient-admission)
6. [Phase 6: Pharmacy Dispensing](#phase-6-pharmacy-dispensing)
7. [Phase 7: Billing & Payment](#phase-7-billing--payment)
8. [Phase 8: Discharge](#phase-8-discharge)
9. [Gap Analysis — Current vs Required](#gap-analysis--current-vs-required)
10. [Complete Flow Diagram](#complete-flow-diagram)
11. [Priority Entities to Build](#priority-entities-to-build)

---

## Phase 1: Patient Arrival & Registration

**Location:** Reception / Front Desk  
**Primary Actor:** `receptionist`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 1a | Patient walks in (or arrives via ambulance) | Patient | — |
| 1b | Receptionist checks if patient exists in the system | `receptionist` | Search by name, phone, national ID, patient number |
| 1c | **New patient?** → Registration form (demographics, contact, emergency contact, insurance) | `receptionist` | Creates a `Patient` record with auto-generated `patientNumber` (e.g. `P2601234`) |
| 1d | **Returning patient?** → Pull up existing record, verify/update info | `receptionist` | Updates `Patient` record, `lastVisit` field |
| 1e | Insurance verification (if applicable) | `receptionist` | Check `insuranceProvider` + `insuranceNumber` |

### Current Status

- ✅ `Patient` model with full demographics, emergency contact, insurance fields
- ✅ `PatientUtils.createPatient()` with auto-generated patient number
- ✅ `PatientUtils.generatePatientNumber()` → `P{YY}{RANDOM}`
- ❌ **Visit/Encounter** entity (ties everything from arrival to discharge into one record)
- ❌ **Queue/Appointment** system
- ❌ **Insurance verification** workflow

---

## Phase 2: Triage (Nurse Assessment)

**Location:** Triage Area / Nursing Station  
**Primary Actor:** `nurse`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 2a | Nurse calls patient from waiting queue | `nurse` | Queue management system |
| 2b | **Vital signs** recorded (BP, temp, heart rate, O2, weight, pain scale) | `nurse` | Creates `VitalSigns` record |
| 2c | **Chief complaint** documented ("I have chest pain for 2 days") | `nurse` | Stored in the Encounter |
| 2d | **Priority/Urgency** assigned (Emergency, Urgent, Routine) | `nurse` | Triage classification |
| 2e | Patient routed to appropriate department/doctor | `nurse` | Queue → Doctor assignment |

### Triage Classification (Standard)

| Level | Color | Category | Response Time | Example |
|-------|-------|----------|---------------|---------|
| 1 | 🔴 Red | **Resuscitation** | Immediate | Cardiac arrest, major trauma |
| 2 | 🟠 Orange | **Emergency** | < 10 min | Chest pain, severe bleeding |
| 3 | 🟡 Yellow | **Urgent** | < 30 min | Fracture, high fever |
| 4 | 🟢 Green | **Semi-Urgent** | < 60 min | Minor laceration, mild pain |
| 5 | 🔵 Blue | **Non-Urgent** | < 120 min | Cold symptoms, routine checkup |

### Current Status

- ✅ `VitalSigns` interface (temperature, BP systolic/diastolic, heart rate, respiratory rate, O2 saturation, weight, height, BMI, pain scale)
- ❌ **Triage** entity with urgency classification
- ❌ **Queue management** (waiting list, estimated wait time)
- ❌ **Department routing** logic

---

## Phase 3: Doctor Consultation

**Location:** Consultation Room / OPD  
**Primary Actor:** `doctor`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 3a | Doctor reviews patient history, vitals, past medical records | `doctor` | Pulls `MedicalRecord[]`, `VitalSigns`, allergies, chronic conditions |
| 3b | **Clinical examination** — doctor examines patient | `doctor` | Documents findings in clinical notes |
| 3c | **Diagnosis** — ICD-10 coded diagnosis | `doctor` | `MedicalRecord.diagnosis` |
| 3d | **Orders** placed: Lab tests, imaging (X-ray, CT, MRI), procedures | `doctor` | Creates `LabOrder`, `ImagingOrder` |
| 3e | **Prescription** written | `doctor` | Creates `Prescription` → links to `Product` (medications) |
| 3f | **Decision point**: Admit (inpatient), Treat & Discharge (outpatient), or Refer | `doctor` | Updates Encounter status |

### Decision Tree After Consultation

```
Doctor Consultation Complete
         │
         ├── Outpatient (OPD)
         │     ├── Prescribe medications → Pharmacy
         │     ├── Order lab tests → Lab
         │     ├── Schedule follow-up → Appointment
         │     └── Discharge with instructions
         │
         ├── Inpatient (IPD)
         │     ├── Admit to ward → Bed assignment
         │     ├── Ongoing treatment plan
         │     └── Daily rounds until discharge
         │
         └── Referral
               ├── Internal referral (another department/specialist)
               └── External referral (another hospital)
```

### Current Status

- ✅ `MedicalRecord` with chief complaint, symptoms, diagnosis, treatment, medications, followUpDate, vitals
- ✅ `doctor` role with `prescribe_medication`, `access_medical_records` permissions
- ❌ **Lab Order** system (order → lab processes → results return to doctor)
- ❌ **Prescription** entity (separate from MedicalRecord, links to pharmacy `Product`)
- ❌ **Imaging/Radiology** orders
- ❌ **ICD-10 diagnosis coding**
- ❌ **Referral** system

---

## Phase 4: Diagnostics (Lab & Imaging)

**Location:** Laboratory / Radiology Department  
**Primary Actor:** `lab_technician`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 4a | Lab receives test orders from doctor | `lab_technician` | Lab Order queue |
| 4b | Samples collected (blood, urine, etc.) | `lab_technician` | Sample tracking with barcode |
| 4c | Tests processed and analyzed | `lab_technician` | Test-specific workflows |
| 4d | Results entered into system with reference ranges | `lab_technician` | `LabResult` with normal/abnormal flags |
| 4e | Results sent back to ordering doctor | System | Push notification to doctor |
| 4f | Doctor reviews and acts on results | `doctor` | May update diagnosis or treatment plan |

### Common Lab Test Categories

| Category | Examples |
|----------|----------|
| Hematology | CBC, Blood smear, ESR |
| Biochemistry | Glucose, Liver function, Kidney function, Lipid profile |
| Microbiology | Blood culture, Urine culture, Sensitivity testing |
| Serology | HIV, Hepatitis B/C, Malaria RDT |
| Urinalysis | Urine routine, Urine culture |
| Parasitology | Stool exam, Malaria smear |

### Current Status

- ✅ `lab_technician` role
- ✅ `access_lab_results` permission
- ❌ **LabOrder** entity (doctor creates order)
- ❌ **LabResult** entity (technician enters results)
- ❌ **Sample tracking** workflow
- ❌ **Result notification** system
- ❌ **Reference range** management

---

## Phase 5: Inpatient Admission

**Location:** Hospital Wards  
**Primary Actors:** `nurse`, `doctor`, `hospital_admin`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 5a | Bed assigned in appropriate ward/department | `nurse` / `hospital_admin` | Bed management (linked to `Hospital.bedCapacity`, `Hospital.departments`) |
| 5b | Admission record created | `receptionist` | `Admission` entity with admit date, assigned ward, bed number, admitting doctor |
| 5c | Nursing assessment completed | `nurse` | Initial nursing care plan |
| 5d | Ongoing nursing care — vitals charted regularly (q4h, q6h, etc.) | `nurse` | Multiple `VitalSigns` records over time |
| 5e | Doctor rounds — daily progress notes | `doctor` | `ProgressNote` entries |
| 5f | Medication administration — nurses give prescribed meds on schedule | `nurse` | Medication Administration Record (MAR) |
| 5g | Inter-department consults if needed | `doctor` | Internal referral |
| 5h | Diet and nutrition management | `nurse` | Diet orders |
| 5i | Patient monitoring and escalation if condition worsens | `nurse` | Alert system |

### Ward Types (Typical)

| Ward | Description | Typical Bed Count |
|------|-------------|-------------------|
| General / Medical | General medicine patients | 20–40 |
| Surgical | Pre/post-operative patients | 15–30 |
| Pediatric | Children (0–15 years) | 10–20 |
| Maternity / OB-GYN | Pregnancy, delivery, postpartum | 15–25 |
| ICU / CCU | Critical care / cardiac care | 5–15 |
| Emergency | Short-stay emergency observation | 5–10 |
| Isolation | Infectious disease patients | 3–8 |
| VIP / Private | Private rooms | 5–10 |

### Bed Status Lifecycle

```
AVAILABLE → OCCUPIED → DISCHARGE_PENDING → CLEANING → AVAILABLE
                │
                ├── MAINTENANCE (broken, under repair)
                └── RESERVED (pre-booked for admission)
```

### Current Status

- ✅ `Hospital` entity with `bedCapacity` and `departments[]`
- ✅ `manage_wards` permission
- ✅ `nurse` role
- ❌ **Ward** entity (individual ward details, nurse assignment)
- ❌ **Bed** entity (bed number, status, assignment)
- ❌ **Admission** entity (admit/transfer/discharge tracking)
- ❌ **Progress Notes** (daily doctor notes)
- ❌ **Medication Administration Record (MAR)**
- ❌ **Nursing care plans**

---

## Phase 6: Pharmacy Dispensing

**Location:** Hospital Pharmacy / Outpatient Pharmacy  
**Primary Actor:** `pharmacist`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 6a | Prescription arrives at pharmacy (digital order from doctor) | System | `Prescription` → Pharmacy queue |
| 6b | Pharmacist verifies: drug interactions, allergies, dosage correctness | `pharmacist` | Cross-checks patient `allergies[]`, `currentMedications[]` |
| 6c | Pharmacist checks stock availability | `pharmacist` | Queries `InventoryItem.quantityAvailable` |
| 6d | Medication dispensed from inventory | `pharmacist` | `StockMovement` (type: DISPENSED), updates `InventoryItem.quantityOnHand` |
| 6e | Batch/lot tracking (FEFO — First Expired, First Out) | `pharmacist` | Uses `InventoryBatch.expiryDate` for selection |
| 6f | Patient counseled on medication usage | `pharmacist` | `Product.dosageInstructions` displayed |
| 6g | Dispensing record created and linked to bill | `pharmacist` | Creates `SaleItem` linked to `Sale` |

### Pharmacy Workflow (Inpatient vs Outpatient)

```
INPATIENT:                              OUTPATIENT:
Doctor writes order                     Doctor writes prescription
       │                                       │
       ▼                                       ▼
Pharmacy receives order                 Patient brings Rx to pharmacy
       │                                       │
       ▼                                       ▼
Pharmacist reviews                      Pharmacist reviews
       │                                       │
       ▼                                       ▼
Medication prepared                     Medication dispensed
       │                                       │
       ▼                                       ▼
Sent to ward via nurse                  Patient pays & leaves
       │
       ▼
Nurse administers to patient (MAR)
```

### Current Status

- ✅ Full pharmacy inventory system (`Product`, `InventoryItem`, `InventoryBatch`, `StockMovement`)
- ✅ `Sale`, `SaleItem`, `SalePayment` models for POS
- ✅ Batch tracking with FEFO support
- ✅ `pharmacist` role with `dispense_medication` permission
- ❌ **Prescription** entity bridging doctor's order → pharmacy dispensing
- ❌ **Drug interaction checking** logic
- ❌ **Dispensing queue** for pharmacist workflow
- ❌ **Inpatient medication order** workflow (separate from POS sale)

---

## Phase 7: Billing & Payment

**Location:** Billing / Cashier Counter  
**Primary Actor:** `cashier`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 7a | All charges accumulated throughout the visit/admission | System | Auto-generated from all service touchpoints |
| 7b | **Invoice** generated with itemized breakdown | `cashier` | `Invoice` entity with line items |
| 7c | Insurance claim submitted (if applicable) | `cashier` / System | `InsuranceClaim` linked to invoice |
| 7d | Insurance company pays their portion | System | Tracks insurance payments |
| 7e | Patient pays co-pay or full amount | `cashier` | `Payment` record (cash, card, mobile money) |
| 7f | Receipt generated | System | Printed/digital receipt |
| 7g | Financial reconciliation | `admin` | Daily/monthly settlement reports |

### Charge Categories

| Category | Examples | Typical Billing |
|----------|----------|-----------------|
| **Consultation** | OPD visit, specialist consult | Fixed fee per visit |
| **Laboratory** | Blood tests, cultures | Per test |
| **Imaging** | X-ray, Ultrasound, CT, MRI | Per procedure |
| **Pharmacy** | Medications dispensed | Per item |
| **Room/Bed** | Ward bed, ICU bed, private room | Per night |
| **Procedures** | Surgery, minor procedures | Per procedure (tiered) |
| **Nursing** | Injection, dressing, catheter | Per service |
| **Consumables** | Gloves, syringes, bandages | Per item used |
| **Emergency** | ER visit fee | Flat fee + procedures |

### Payment Methods (Central Africa Context)

| Method | Details |
|--------|---------|
| Cash (CDF) | Congolese Franc — most common |
| Cash (USD) | US Dollar — accepted for larger bills |
| Mobile Money | M-Pesa, Orange Money, Airtel Money |
| Insurance | CNSS, private insurers, company plans |
| Bank Transfer | For corporate/insurance settlements |
| Credit/Debit Card | Limited availability |

### Current Status

- ✅ `Sale`, `SaleItem`, `SalePayment` models (POS-oriented)
- ✅ `manage_billing` permission, `cashier` role
- ✅ Multi-currency support (CDF, USD)
- ❌ **Invoice** entity (separate from POS — accumulates all hospital charges)
- ❌ **Service charges** catalog (consultation fees, bed rates, procedure costs)
- ❌ **Insurance claim** management
- ❌ **Itemized hospital bill** (different from pharmacy sale)

---

## Phase 8: Discharge

**Location:** Ward → Billing → Exit  
**Primary Actors:** `doctor`, `nurse`, `cashier`, `receptionist`

| Step | What Happens | Who | System Role |
|------|-------------|-----|-------------|
| 8a | Doctor determines patient is ready for discharge | `doctor` | Updates encounter/admission status |
| 8b | **Discharge summary** written (diagnosis, treatment given, outcome, condition at discharge) | `doctor` | `DischargeSummary` entity |
| 8c | **Discharge medications** prescribed (take-home meds) | `doctor` | New `Prescription` → Pharmacy |
| 8d | **Follow-up appointment** scheduled | `doctor` / `nurse` | `Appointment` entity |
| 8e | **Patient instructions** provided (care at home, diet, activity restrictions, warning signs) | `nurse` | Part of discharge summary |
| 8f | **Bed released** and marked for cleaning | `nurse` | Bed status → `CLEANING` → `AVAILABLE` |
| 8g | **Final bill** generated and settled | `cashier` | Invoice marked as PAID |
| 8h | Patient leaves — status updated | `receptionist` | Encounter → COMPLETED, `Patient.lastVisit` updated |

### Discharge Summary Contents

```
┌────────────────────────────────────────────────┐
│            DISCHARGE SUMMARY                    │
├────────────────────────────────────────────────┤
│ Patient: John Doe (P260001)                     │
│ Admitted: 2026-02-05  Discharged: 2026-02-11    │
│ Ward: Medical Ward  Bed: MW-12                  │
├────────────────────────────────────────────────┤
│ Admitting Diagnosis: Community Acquired Pneumonia│
│ Final Diagnosis: Bilateral Pneumonia (J18.1)    │
│                                                 │
│ Treatment Given:                                │
│  - IV Ceftriaxone 1g BD × 5 days               │
│  - IV Paracetamol 1g TDS × 3 days              │
│  - Oxygen therapy 2L/min × 2 days              │
│  - Chest physiotherapy                          │
│                                                 │
│ Condition at Discharge: Improved, stable        │
│                                                 │
│ Discharge Medications:                          │
│  - Amoxicillin 500mg TDS × 7 days              │
│  - Paracetamol 500mg TDS PRN                    │
│                                                 │
│ Follow-up: OPD in 2 weeks (2026-02-25)          │
│                                                 │
│ Instructions:                                   │
│  - Complete full course of antibiotics           │
│  - Rest, adequate fluids                        │
│  - Return if fever recurs or breathing worsens  │
│                                                 │
│ Attending Doctor: Dr. Mukendi (License: MD-4521) │
└────────────────────────────────────────────────┘
```

### Current Status

- ❌ **Discharge Summary** entity
- ❌ **Appointment** scheduling system
- ❌ **Encounter** lifecycle management (OPEN → IN_PROGRESS → COMPLETED)

---

## Gap Analysis — Current vs Required

### ✅ What We Already Have

| Entity/Feature | Model File | Status |
|---------------|------------|--------|
| Patient (demographics, contact, medical) | `src/models/Patient.ts` | ✅ Complete |
| Vital Signs | `src/models/Patient.ts` | ✅ Complete |
| Medical Record | `src/models/Patient.ts` | ✅ Complete |
| Hospital Facility | `src/models/Organization.ts` | ✅ Complete |
| Product (Pharmaceutical) | `src/models/Inventory.ts` | ✅ Complete |
| Inventory Management | `src/models/Inventory.ts` | ✅ Complete |
| Batch/Lot Tracking | `src/models/Inventory.ts` | ✅ Complete |
| Stock Movements | `src/models/Inventory.ts` | ✅ Complete |
| POS Sales | `src/models/Sale.ts` | ✅ Complete |
| User Roles & Permissions | `src/models/User.ts` | ✅ Complete |
| Organization & Licensing | `src/models/Organization.ts` | ✅ Complete |

### ❌ What We Need to Build

| Priority | Entity | Purpose | Connects To |
|----------|--------|---------|-------------|
| 🔴 **P0** | **Encounter / Visit** | The spine — ties everything from arrival to discharge | Patient, Doctor, All orders |
| 🔴 **P0** | **Appointment** | OPD scheduling, follow-ups, doctor time slots | Patient, Doctor, Department |
| 🔴 **P0** | **Prescription** | Doctor → Pharmacy bridge | MedicalRecord, Product, Patient |
| 🟠 **P1** | **Ward** | Ward details, nurse staffing, capacity | Hospital, Bed, Nurse |
| 🟠 **P1** | **Bed** | Individual bed tracking (status, assignment) | Ward, Patient, Admission |
| 🟠 **P1** | **Admission** | Inpatient admit/transfer/discharge tracking | Patient, Encounter, Bed, Doctor |
| 🟠 **P1** | **Invoice / HospitalBill** | Itemized hospital billing (not POS) | Encounter, Patient, Services |
| 🟠 **P1** | **ServiceCatalog** | Consultation fees, procedure costs, bed rates | Invoice |
| 🟡 **P2** | **LabOrder** | Doctor orders lab tests | Encounter, Patient, Doctor |
| 🟡 **P2** | **LabResult** | Lab technician enters results | LabOrder, Patient |
| 🟡 **P2** | **DischargeSummary** | Discharge documentation | Admission, Patient, Doctor |
| 🟡 **P2** | **ProgressNote** | Daily doctor/nurse notes during admission | Admission, Patient, Doctor/Nurse |
| 🟢 **P3** | **Triage** | Emergency department classification | Encounter, Patient, Nurse |
| 🟢 **P3** | **MedicationAdministration** | MAR — nurse tracks med given to inpatient | Prescription, Patient, Nurse |
| 🟢 **P3** | **InsuranceClaim** | Insurance billing/reimbursement workflow | Invoice, Patient, Insurance |
| 🟢 **P3** | **Referral** | Internal/external referrals | Patient, Doctor, Hospital |
| 🟢 **P3** | **ImagingOrder** | Radiology/imaging requests | Encounter, Patient, Doctor |

---

## Complete Flow Diagram

```
                          Patient Arrives
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Registration      │
                    │    (Receptionist)    │
                    │                     │
                    │ • New → Register    │
                    │ • Returning → Lookup│
                    │ • Create Encounter  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Triage          │
                    │      (Nurse)        │
                    │                     │
                    │ • Record vitals     │
                    │ • Chief complaint   │
                    │ • Assign priority   │
                    │ • Route to doctor   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Doctor Consult     │
                    │      (Doctor)       │
                    │                     │
                    │ • Review history    │
                    │ • Examine patient   │
                    │ • Diagnose (ICD-10) │
                    │ • Place orders      │
                    └───┬──────┬──────┬───┘
                        │      │      │
           ┌────────────┘      │      └────────────┐
           ▼                   ▼                   ▼
  ┌────────────────┐  ┌───────────────┐  ┌─────────────────┐
  │  Lab / Imaging  │  │  Prescription  │  │  Admit to Ward?  │
  │  (Lab Tech)    │  │   (Doctor)    │  │   (Doctor)      │
  │                │  │               │  │                 │
  │ • Collect      │  │ • Medications │  │ YES:            │
  │   samples      │  │ • Dosage      │  │ • Assign bed    │
  │ • Run tests    │  │ • Duration    │  │ • Nursing care  │
  │ • Enter results│  │               │  │ • Daily rounds  │
  └───────┬────────┘  └───────┬───────┘  │ • Progress notes│
          │                   │          │ • MAR           │
          ▼                   ▼          └────────┬────────┘
  ┌────────────────┐  ┌───────────────┐           │
  │ Results to Doc  │  │   Pharmacy    │           │
  │                │  │  (Pharmacist) │           │
  │ • Review       │  │               │           │
  │ • Update Dx    │  │ • Verify Rx   │           │
  │ • Adjust Tx    │  │ • Check allerg│           │
  └────────────────┘  │ • Dispense    │           │
                      │ • Counsel pt  │           │
                      └───────────────┘           │
                                                  │
                               ┌──────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │     Discharge        │
                    │                     │
                    │ • Discharge summary │
                    │ • Take-home meds   │
                    │ • Follow-up appt   │
                    │ • Patient education│
                    │ • Release bed      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Billing          │
                    │     (Cashier)       │
                    │                     │
                    │ • Itemized invoice  │
                    │ • Insurance claim   │
                    │ • Patient payment   │
                    │ • Receipt           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Patient Leaves     │
                    │                     │
                    │ • Encounter closed  │
                    │ • lastVisit updated │
                    │ • Records archived  │
                    └─────────────────────┘
```

---

## Priority Entities to Build

### 🔴 P0 — Critical (Must Have for MVP Hospital Module)

#### 1. Encounter / Visit

> The central record that ties everything together for a single patient visit.

```typescript
interface Encounter {
  id: string;
  patientId: string;              // → Patient
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  encounterNumber: string;        // Auto: "E260001"
  type: 'outpatient' | 'inpatient' | 'emergency' | 'day_case';
  status: 'registered' | 'triaged' | 'in_consultation' | 'admitted' | 'discharged' | 'cancelled';
  arrivalDate: string;            // ISO timestamp
  dischargeDate?: string;
  chiefComplaint: string;
  assignedDoctorId?: string;      // → User (doctor)
  assignedNurseId?: string;       // → User (nurse)
  departmentId?: string;
  priority: 'emergency' | 'urgent' | 'semi_urgent' | 'routine';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
```

#### 2. Appointment

> Scheduling system for OPD visits and follow-ups.

```typescript
interface Appointment {
  id: string;
  patientId: string;              // → Patient
  doctorId: string;               // → User (doctor)
  organizationId: string;
  facilityId: string;
  appointmentNumber: string;      // Auto: "A260001"
  date: string;                   // ISO date
  startTime: string;              // "09:30"
  endTime: string;                // "10:00"
  type: 'new_visit' | 'follow_up' | 'procedure' | 'lab_only' | 'consultation';
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  department?: string;
  reason: string;
  notes?: string;
  encounterId?: string;           // → Encounter (created on check-in)
  createdAt: string;
  updatedAt?: string;
}
```

#### 3. Prescription

> Bridge between doctor's clinical decision and pharmacy dispensing.

```typescript
interface Prescription {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  doctorId: string;               // → User (doctor)
  organizationId: string;
  prescriptionNumber: string;     // Auto: "RX260001"
  date: string;
  status: 'pending' | 'partially_dispensed' | 'fully_dispensed' | 'cancelled' | 'expired';
  items: PrescriptionItem[];
  notes?: string;
  validUntil?: string;            // Prescription expiry
  createdAt: string;
  updatedAt?: string;
}

interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  productId?: string;             // → Product (linked when dispensed)
  medicationName: string;         // Free text (may not match product catalog)
  dosage: string;                 // "500mg"
  frequency: string;              // "TDS" (three times daily)
  duration: string;               // "7 days"
  quantity: number;               // Total qty to dispense
  quantityDispensed: number;      // Qty actually dispensed so far
  route: 'oral' | 'iv' | 'im' | 'sc' | 'topical' | 'rectal' | 'inhaled' | 'sublingual' | 'other';
  instructions?: string;          // "Take after meals"
  isSubstitutionAllowed: boolean;
  status: 'pending' | 'dispensed' | 'cancelled' | 'out_of_stock';
}
```

---

### 🟠 P1 — Important (Required for Inpatient & Billing)

#### 4. Ward & Bed

```typescript
interface Ward {
  id: string;
  hospitalId: string;             // → Hospital
  organizationId: string;
  name: string;                   // "Medical Ward A"
  code: string;                   // "MW-A"
  type: 'general' | 'surgical' | 'pediatric' | 'maternity' | 'icu' | 'ccu' | 'emergency' | 'isolation' | 'psychiatric' | 'vip';
  floor: number;
  totalBeds: number;
  headNurseId?: string;           // → User (nurse)
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Bed {
  id: string;
  wardId: string;                 // → Ward
  bedNumber: string;              // "MW-A-12"
  type: 'standard' | 'electric' | 'icu' | 'pediatric' | 'bariatric' | 'crib';
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning' | 'out_of_service';
  currentPatientId?: string;      // → Patient
  currentAdmissionId?: string;    // → Admission
  features?: string[];            // ["oxygen_port", "suction", "monitor"]
  dailyRate: number;              // Cost per night
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

#### 5. Admission

```typescript
interface Admission {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  organizationId: string;
  admissionNumber: string;        // Auto: "ADM260001"
  admitDate: string;
  dischargeDate?: string;
  status: 'admitted' | 'transferred' | 'discharged' | 'deceased' | 'absconded';
  admittingDoctorId: string;      // → User (doctor)
  attendingDoctorId: string;      // → User (doctor)
  wardId: string;                 // → Ward
  bedId: string;                  // → Bed
  admissionReason: string;
  admissionDiagnosis: string;
  finalDiagnosis?: string;
  dietaryRestrictions?: string[];
  specialInstructions?: string;
  estimatedStayDays?: number;
  createdAt: string;
  updatedAt?: string;
}
```

#### 6. Hospital Invoice

```typescript
interface HospitalInvoice {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  organizationId: string;
  invoiceNumber: string;          // Auto: "INV260001"
  date: string;
  dueDate?: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'insurance_pending';
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  insuranceCoveredAmount: number;
  patientResponsibility: number;
  currency: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

interface InvoiceItem {
  id: string;
  invoiceId: string;
  category: 'consultation' | 'laboratory' | 'imaging' | 'pharmacy' | 'room_bed' | 'procedure' | 'nursing' | 'consumables' | 'emergency' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serviceDate: string;
  referenceId?: string;           // Link to LabOrder, Prescription, Bed, etc.
  referenceType?: string;
}
```

---

### 🟡 P2 — Valuable (Enhances Clinical Workflow)

#### 7. LabOrder & LabResult

```typescript
interface LabOrder {
  id: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  organizationId: string;
  orderNumber: string;            // Auto: "LAB260001"
  date: string;
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  tests: LabTest[];
  clinicalNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

interface LabTest {
  id: string;
  orderId: string;
  testName: string;
  testCode: string;
  category: string;               // "Hematology", "Biochemistry", etc.
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  result?: string;
  unit?: string;
  referenceRange?: string;        // "4.5 - 11.0"
  flag?: 'normal' | 'low' | 'high' | 'critical';
  performedBy?: string;           // → User (lab_technician)
  completedAt?: string;
  notes?: string;
}
```

#### 8. Discharge Summary

```typescript
interface DischargeSummary {
  id: string;
  admissionId: string;            // → Admission
  encounterId: string;            // → Encounter
  patientId: string;
  doctorId: string;
  organizationId: string;
  dischargeDate: string;
  admittingDiagnosis: string;
  finalDiagnosis: string;
  diagnosisCode?: string;         // ICD-10
  treatmentSummary: string;
  proceduresPerformed?: string[];
  conditionAtDischarge: 'improved' | 'stable' | 'deteriorated' | 'unchanged' | 'deceased';
  dischargeMedications: DischargeMedication[];
  followUpInstructions: string;
  followUpDate?: string;
  dietaryAdvice?: string;
  activityRestrictions?: string;
  warningSignsToWatch?: string[];
  referrals?: string[];
  createdAt: string;
  updatedAt?: string;
}

interface DischargeMedication {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}
```

#### 9. Progress Note

```typescript
interface ProgressNote {
  id: string;
  admissionId: string;            // → Admission
  patientId: string;
  authorId: string;               // → User (doctor or nurse)
  authorRole: 'doctor' | 'nurse';
  date: string;
  type: 'daily_round' | 'procedure_note' | 'consultation_note' | 'nursing_note' | 'handoff';
  subjective?: string;            // SOAP: Patient's complaints
  objective?: string;             // SOAP: Examination findings
  assessment?: string;            // SOAP: Doctor's assessment
  plan?: string;                  // SOAP: Treatment plan
  vitals?: VitalSigns;
  content?: string;               // Free-text alternative to SOAP
  createdAt: string;
  updatedAt?: string;
}
```

---

### 🟢 P3 — Nice to Have (Advanced Features)

#### 10. Triage

```typescript
interface Triage {
  id: string;
  encounterId: string;
  patientId: string;
  nurseId: string;
  triageDate: string;
  level: 1 | 2 | 3 | 4 | 5;
  category: 'resuscitation' | 'emergency' | 'urgent' | 'semi_urgent' | 'non_urgent';
  chiefComplaint: string;
  vitals: VitalSigns;
  painLocation?: string;
  painCharacter?: string;
  symptomDuration?: string;
  allergiesVerified: boolean;
  notes?: string;
  createdAt: string;
}
```

#### 11. Medication Administration Record (MAR)

```typescript
interface MedicationAdministration {
  id: string;
  admissionId: string;
  patientId: string;
  prescriptionItemId: string;
  nurseId: string;                // → User (nurse who administered)
  scheduledTime: string;
  administeredTime?: string;
  status: 'scheduled' | 'given' | 'missed' | 'refused' | 'held' | 'discontinued';
  dose: string;
  route: string;
  site?: string;
  notes?: string;
  witnessId?: string;             // For controlled substances
  createdAt: string;
}
```

#### 12. Insurance Claim

```typescript
interface InsuranceClaim {
  id: string;
  invoiceId: string;              // → HospitalInvoice
  patientId: string;
  organizationId: string;
  claimNumber: string;
  insuranceProvider: string;
  policyNumber: string;
  submissionDate: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'partially_approved' | 'rejected' | 'paid';
  claimAmount: number;
  approvedAmount?: number;
  paidAmount?: number;
  rejectionReason?: string;
  currency: string;
  documents?: string[];           // Attached supporting docs
  createdAt: string;
  updatedAt?: string;
}
```

---

## Suggested Implementation Order

```
Sprint 1 (Foundation):
  ├── Encounter model + CRUD
  ├── Appointment model + CRUD
  └── Prescription model + CRUD

Sprint 2 (Inpatient):
  ├── Ward & Bed models + management screens
  ├── Admission model + admit/discharge workflow
  └── Hospital Invoice + billing screens

Sprint 3 (Clinical):
  ├── LabOrder & LabResult models
  ├── Discharge Summary
  └── Progress Notes (SOAP format)

Sprint 4 (Advanced):
  ├── Triage system
  ├── Medication Administration Record
  ├── Insurance Claims
  └── Referral system
```

---

## References

- **WHO Hospital Management Guidelines**
- **HL7 FHIR Standard** (data model reference)
- **ICD-10 Classification** (diagnosis coding)
- **SNOMED CT** (clinical terminology)
- **South African Triage Scale (SATS)** — adapted for Central Africa context

---

> **Next Step:** Begin implementing P0 entities (`Encounter`, `Appointment`, `Prescription`) in `src/models/`
