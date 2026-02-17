# Frontend Implementation: System Relationships in Action

**File:** [src/](src/)  
**Framework:** React Native + Expo + Redux  
**Updated:** February 2026

---

## Front-End Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              APP.TSX (Main Entry Point)                     │
│  ├─ AuthNavigator (License Activation → Login)              │
│  └─ AppNavigator (Role-based bottom tabs + sidebar)         │
└─────────────────────────────────────────────────────────────┘
         │
         ├─ Redux Store (authSlice + state management)
         │   └─ user, organization, activeModules, permissions
         │
         ├─ DatabaseService (SQLite - offline-first)
         │   └─ Caches patients, encounters, prescriptions, etc.
         │
         ├─ AuthService (Authentication + session)
         │   ├─ Login with phone/password
         │   ├─ License validation
         │   └─ Module access control
         │
         └─ Module Navigators (Hospital, Pharmacy, Occ Health)
             ├─ Hospital: Encounters, Triage, Vital Signs, Etc
             ├─ Pharmacy: POS, Inventory, Prescriptions
             └─ Occ Health: Workers, Exams, Fitness Cert
```

---

## 1. Authentication Flow

### 1.1 License Activation → User Login → Module Loading

**File:** [src/navigation/AuthNavigator.tsx](src/navigation/AuthNavigator.tsx)

```tsx
AuthNavigator
├─ LicenseActivationScreen
│  ├─ User enters license key (e.g., "TRIAL-HK2024XY-Z9M3")
│  ├─ LicenseService validates against in-memory license database
│  ├─ If valid:
│  │  ├─ Store licenseKey in AsyncStorage
│  │  ├─ Extract organization & modules from license
│  │  └─ Navigate to LoginScreen
│  └─ If invalid:
│     └─ Show error, prompt retry
│
└─ LoginScreen
   ├─ User enters phone + password
   ├─ AuthService.login() sends request to backend
   ├─ Backend validates User.phone + password
   ├─ On success, backend returns:
   │  ├─ User object (role, organization)
   │  ├─ UserModuleAccess (which modules user can access)
   │  └─ Auth token (JWT)
   ├─ Frontend stores token + user data in AsyncStorage + Redux
   └─ Navigate to AppNavigator (main app)
```

**Code Example:**

```typescript
// AuthService.ts
async login(credentials: LoginCredentials): Promise<AuthResult> {
  // 1. License validation (if provided)
  let licenseValidation = null;
  if (credentials.licenseKey) {
    licenseValidation = await this.licenseService.validateLicenseKey(credentials.licenseKey);
    if (!licenseValidation.isValid) {
      return {
        success: false,
        error: `License invalid: ${licenseValidation.errors.join(', ')}`,
      };
    }
  }

  // 2. Get user by phone
  const user = await this.db.getUserByPhone(credentials.phone);
  if (!user) {
    return { success: false, error: 'User not found. Please register.' };
  }

  // 3. Verify password
  const isPasswordValid = await this.verifyPassword(credentials.password, user);
  if (!isPasswordValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  // 4. Get organization + module access
  const organization = await this.db.getOrganization(user.organizationId);
  const userModuleAccess = await this.db.getUserModuleAccess(user.id);

  // 5. Save session
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
    user,
    organization,
    userModuleAccess,
    token: 'generated-jwt-token'
  }));

  // 6. Dispatch to Redux
  dispatch(setUser(user));
  dispatch(setOrganization(organization));
  dispatch(setUserModuleAccess(userModuleAccess));

  return {
    success: true,
    user,
    organization,
    userModuleAccess,
  };
}
```

---

## 2. Role-Based Navigation

### 2.1 Dynamic Tab Navigation by Module Access

**File:** [src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx)

```tsx
AppNavigator
├─ Read activeModules from Redux store
├─ Read user.primaryRole to determine feature level
├─ createDynamicSections() generates sidebar items
│
├─ If PHARMACY active:
│  ├─ Tab: "Pharmacie"
│  ├─ Sub-items (based on license features):
│  │  ├─ Dashboard
│  │  ├─ Point of Sale (POS) [if pos_system licensed]
│  │  ├─ Inventory [if inventory licensed]
│  │  ├─ Prescriptions [if prescription_management licensed]
│  │  ├─ Suppliers [if supplier_management licensed]
│  │  └─ Reports
│  └─ Routes to PharmacyNavigator
│
├─ If HOSPITAL active:
│  ├─ Tab: "Hôpital"
│  ├─ Sub-items:
│  │  ├─ Dashboard
│  │  ├─ Patients
│  │  ├─ Emergency
│  │  ├─ Triage
│  │  ├─ Wards
│  │  ├─ Labs
│  │  └─ Billing
│  └─ Routes to HospitalNavigator
│
└─ If OCCUPATIONAL_HEALTH active:
   ├─ Tab: "Santé Occupationnelle"
   ├─ Sub-items:
   │  ├─ Dashboard
   │  ├─ Enterprises
   │  ├─ Workers
   │  ├─ Medical Exams
   │  ├─ Incidents
   │  └─ Reports
   └─ Routes to OccHealthNavigator
```

**Code Example:**

```typescript
// AppNavigator.tsx - Line 113-160
const createDynamicSections = (
  activeModules: ModuleType[], 
  hasFeature: (feature: string) => boolean
): SidebarSection[] => {
  const sections: SidebarSection[] = [
    {
      title: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
      ],
    }
  ];

  // Pharmacy section
  if (activeModules.includes('PHARMACY') || activeModules.includes('TRIAL')) {
    const pharmacyItems: SidebarMenuItem[] = [
      { id: 'ph-dashboard', label: 'Overview', icon: 'pulse-outline' }
    ];

    if (hasFeature('pos_system')) {
      pharmacyItems.push({ id: 'ph-pos', label: 'Point of Sale', icon: 'cart-outline' });
    }
    
    if (hasFeature('basic_inventory') || hasFeature('advanced_inventory')) {
      pharmacyItems.push({ id: 'ph-inventory', label: 'Inventory', icon: 'cube-outline' });
    }
    
    if (hasFeature('prescription_management')) {
      pharmacyItems.push({ id: 'ph-prescriptions', label: 'Prescriptions', icon: 'document-text-outline' });
    }

    sections.push({
      title: 'Pharmacy',
      items: pharmacyItems,
    });
  }

  return sections;
};
```

---

## 3. Hospital Module: Patient-Encounter-Prescription Flow

### 3.1 Patient Registration → Encounter Creation → Triage → Vital Signs → Prescription

**File Locations:**
- Patient management: [src/modules/hospital/screens/PatientListScreen.tsx](src/modules/hospital/screens/PatientListScreen.tsx)
- Patient detail: [src/modules/hospital/screens/PatientDetailScreen.tsx](src/modules/hospital/screens/PatientDetailScreen.tsx)
- Triage: [src/modules/hospital/screens/TriageScreen.tsx](src/modules/hospital/screens/TriageScreen.tsx)
- Prescriptions: [src/modules/hospital/screens/HospitalPrescriptionsScreen.tsx](src/modules/hospital/screens/HospitalPrescriptionsScreen.tsx)

**Workflow:**

```tsx
1. PATIENT REGISTRATION SCREEN
└─ PatientRegistrationScreen.tsx
   ├─ User: Hospital Receptionist
   ├─ Input fields: firstName, lastName, DOB, phone, email, gender
   ├─ Medical fields: bloodType, allergies, chronicConditions, currentMedications
   ├─ On Submit:
   │  ├─ Create Patient in DatabaseService
   │  ├─ Generate patientNumber (P{YY}{RANDOM})
   │  └─ Navigate to PatientListScreen
   └─ Result: Patient record created with status=ACTIVE


2. PATIENT LIST SCREEN
└─ PatientListScreen.tsx
   ├─ User: Doctor, Nurse, Receptionist
   ├─ DisplayList of all patients in organization
   ├─ Search/filter by patient name, number, status
   ├─ On patient tap:
   │  ├─ Fetch PatientDetailScreen
   │  ├─ Show patient demographics
   │  ├─ Show active encounters
   │  └─ Display action buttons: "New Encounter", "Edit", "Medical Records"
   └─ Result: Navigate to PatientDetailScreen


3. PATIENT DETAIL SCREEN
└─ PatientDetailScreen.tsx
   ├─ User: Doctor, Nurse
   ├─ Display patient info + tabs: "Overview", "Encounters", "Records", "Prescriptions"
   │
   ├─ ENCOUNTER CREATION
   │  ├─ Button: "New Encounter" → createEncounterWithBilling()
   │  ├─ Prompt: Select encounter type (outpatient, consultation)
   │  ├─ Prompt: Select priority (routine, urgent, emergency)
   │  ├─ On confirmation:
   │  │  ├─ Create Encounter
   │  │  │  ├─ encounter.patient = patientId
   │  │  │  ├─ encounter.attendingPhysician = currentUser.id (if doctor)
   │  │  │  ├─ encounter.status = 'registered'
   │  │  │  ├─ encounter.organization = currentOrganization.id
   │  │  │  └─ encounter.createdBy = currentUser.id
   │  │  ├─ Create Invoice (for billing later)
   │  │  │  ├─ invoice.organizationId = organization.id
   │  │  │  ├─ invoice.encounterId = encounter.id
   │  │  │  ├─ invoice.patientId = patient.id
   │  │  │  └─ invoice.status = 'draft'
   │  │  └─ Navigate to TriageScreen
   │  │
   │  └─ Result: Encounter created with initial vital signs + draft invoice
   │
   ├─ ENCOUNTERS TAB
   │  ├─ Active encounters (status: registered, in_progress)
   │  ├─ Past encounters (status: completed)
   │  ├─ For each encounter:
   │  │  ├─ Show encounter_number, attendingPhysician, date
   │  │  ├─ Action buttons:
   │  │  │  ├─ "Triage" (if status = registered)
   │  │  │  ├─ "Consultation" (if status = in_triage)
   │  │  │  ├─ "Vital Signs" (if status = in_consultation)
   │  │  │  └─ "Prescribe" (if status = in_consultation)
   │  │  └─ On action: navigate with encounterId
   │  │
   │  └─ Result: Quick access to in-flight encounters
   │
   ├─ RECORDS TAB
   │  ├─ Display MedicalRecords (lab results, imaging, notes)
   │  └─ Result: Historical docs
   │
   └─ PRESCRIPTIONS TAB
      ├─ Display all prescriptions for patient (across all encounters)
      ├─ Group by date, show status
      └─ Tap to view details/dispensing status


4. TRIAGE SCREEN
└─ TriageScreen.tsx
   ├─ User: Nurse
   ├─ Inputs:
   │  ├─ Chief Complaint
   │  ├─ Vital Signs: 
   │  │  ├─ Temperature
   │  │  ├─ Blood Pressure (sys/dia)
   │  │  ├─ Heart Rate
   │  │  ├─ Respiratory Rate
   │  │  ├─ Oxygen Saturation
   │  │  ├─ Weight, Height (→ calculates BMI)
   │  │  └─ Blood Glucose (if diabetic or needed)
   │  └─ Initial Assessment
   │
   ├─ On Save:
   │  ├─ Save to Encounter
   │  │  ├─ encounter.chiefComplaint = text
   │  │  ├─ encounter.status = 'in_triage'
   │  │  └─ encounter.measuredBy = currentUser.id (nurse)
   │  ├─ Save VitalSigns
   │  │  ├─ vitalSigns.encounterId = encounter.id
   │  │  ├─ vitalSigns.patientId = patient.id
   │  │  ├─ vitalSigns.measuredBy = currentUser.id (nurse)
   │  │  ├─ vitalSigns.timestamp = now
   │  │  └─ Calculate: BMI, BP_category, is_abnormal
   │  ├─ Check abnormal values
   │  │  ├─ If BP > 180/110: Flag as critical
   │  │  ├─ If temp < 35 or > 40: Flag as critical
   │  │  └─ If O2sat < 90: Flag as critical
   │  │
   │  └─ Result: Navigate to ConsultationScreen (or wait for doctor)
   │
   └─ Next step: Doctor consultation


5. CONSULTATION SCREEN
└─ HospitalConsultationScreen.tsx
   ├─ User: Doctor
   ├─ Display:
   │  ├─ Patient demographics (name, age, blood type)
   │  ├─ Recent vital signs (from triage)
   │  ├─ Alerts: allergies, chronic conditions, medications
   │  └─ Previous encounters (chronological)
   │
   ├─ Inputs:
   │  ├─ Chief Complaint (read-only from triage)
   │  ├─ Assessment/Diagnosis (free text)
   │  ├─ Plan (diagnoses, referrals, prescriptions)
   │  └─ Decision: 
   │     ├─ Discharge
   │     ├─ Admit to Ward
   │     └─ Refer to Specialist
   │
   ├─ On PRESCRIBE button:
   │  ├─ Navigate to EnhancedPrescriptionsScreen with encounterId
   │  ├─ Result: Doctor creates prescription
   │  │
   │  └─ See "6. PRESCRIPTION CREATION" below
   │
   └─ On SAVE:
      ├─ Update encounter
      │  ├─ encounter.attendance = diagnosis
      │  ├─ encounter.status = 'in_consultation' or 'admitted'
      │  └─ encounter.updatedBy = doctor.id
      └─ Result: Saved, ready for pharmacy


6. PRESCRIPTION CREATION (Hospital → Pharmacy Bridge)
└─ EnhancedPrescriptionsScreen.tsx
   ├─ User: Doctor
   ├─ Context: encounterId provided (links to hospital encounter)
   │
   ├─ Display:
   │  ├─ Patient name + allergies (CRITICAL FOR SAFETY)
   │  ├─ Previous prescriptions (auto-check interactions)
   │  ├─ Encounter info: chief complaint, vital signs from triage
   │  └─ Available products (from pharmacy inventory)
   │
   ├─ Add Prescription Item (steps):
   │  ├─ Select Product (searchable by name/sku)
   │  ├─ Show: product name, dosage, strength, contraindications
   │  ├─ Display allergies check:
   │  │  ├─ If patient.allergies.includes(product.ingredient):
   │  │  │  └─ ⚠️ WARNING: "PATIENT ALLERGIC TO THIS"
   │  │  └─ Proceed only if doctor confirms
   │  ├─ Input: quantity, frequency (OD, BD, TID, QID), duration (days)
   │  ├─ Input: instructions (e.g., "Take with food")
   │  └─ Store item in prescription.items[]
   │
   ├─ On CREATE/SAVE:
   │  ├─ Create Prescription record
   │  │  ├─ prescription.patient = patient.id
   │  │  ├─ prescription.doctor = currentUser.id (doctor)
   │  │  ├─ prescription.encounter = encounter.id ← KEY LINK
   │  │  ├─ prescription.organization = organization.id
   │  │  ├─ prescription.status = 'PENDING'
   │  │  ├─ prescription.createdAt = now
   │  │  ├─ prescription.createdBy = doctor.id
   │  │  └─ prescription.items[] = [{ product, qty, freq, duration, instructions }]
   │  ├─ Generate prescription_number (RX{YY}{RANDOM})
   │  ├─ Notify pharmacy (optional push notification)
   │  └─ Result: Prescription ready for pharmacy
   │
   └─ Next step: Pharmacist dispenses (Section 3.2)
```

---

## 4. Pharmacy Module: Prescription Fulfillment → Inventory → POS

### 4.1 Prescription Queue → Verification → Dispensing → Inventory Deduction

**File Locations:**
- Prescriptions: [src/modules/pharmacy/screens/EnhancedOrdonnancesScreen.tsx](src/modules/pharmacy/screens/EnhancedOrdonnancesScreen.tsx)
- Inventory: [src/modules/pharmacy/screens/InventoryScreen.tsx](src/modules/pharmacy/screens/InventoryScreen.tsx)
- POS: [src/modules/pharmacy/screens/POSScreen.tsx](src/modules/pharmacy/screens/POSScreen.tsx)

**Workflow:**

```tsx
1. PHARMACY PRESCRIPTIONS QUEUE
└─ EnhancedPrescriptionsScreen.tsx (pharmacy version)
   ├─ User: Pharmacist, Pharmacy Technician
   ├─ Display:
   │  ├─ All PENDING prescriptions (status = PENDING)
   │  ├─ Sorted by: date created, priority (from encounter.priority)
   │  ├─ For each prescription:
   │  │  ├─ Prescription number
   │  │  ├─ Patient name
   │  │  ├─ Doctor name
   │  │  ├─ Date created
   │  │  ├─ Item count
   │  │  ├─ Status badge
   │  │  └─ Action buttons: "Review", "Dispense", "Hold", "Reject"
   │  │
   │  └─ Alerts:
   │     ├─ OUT_OF_STOCK: Product not available
   │     ├─ EXPIRING_SOON: Product < 30 days till expiry
   │     ├─ LOW_STOCK: Product < min_stock_level
   │     └─ INTERACTION_RISK: Product interacts with patient meds
   │
   └─ On tap prescription: Navigate to prescription detail


2. PRESCRIPTION DETAIL & VERIFICATION
└─ Prescription Detail Screen
   ├─ Display prescription info:
   │  ├─ Patient name + ID
   │  ├─ Patient allergies (color-coded: ⚠️ if items contraindicated)
   │  ├─ Patient chronic conditions
   │  ├─ Patient current medications
   │  ├─ Doctor name
   │  ├─ Encounter type + priority
   │  ├─ Encounter vital signs (if recorded)
   │  └─ Date/time created
   │
   ├─ Display prescription items table:
   │  ├─ Columns: Product | Quantity | Frequency | Duration | Instructions | Status
   │  │
   │  ├─ For each item:
   │  │  ├─ Check 1: Product in stock?
   │  │  │  ├─ If YES: Show quantity available
   │  │  │  ├─ If NO: Mark RED - "OUT OF STOCK"
   │  │  │  └─ If PARTIAL: Mark YELLOW - "Qty {available} < {prescribed}"
   │  │  │
   │  │  ├─ Check 2: Product contraindicated?
   │  │  │  ├─ If patient.allergies.includes(product.ingredient):
   │  │  │  │  └─ Mark RED - "⚠️ PATIENT ALLERGIC"
   │  │  │  └─ If product.contraindications.includes(patientMedication):
   │  │  │     └─ Mark YELLOW - "⚠️ Potential interaction"
   │  │  │
   │  │  ├─ Check 3: Product expiring?
   │  │  │  ├─ If expiryDate < TODAY + 30days:
   │  │  │  │  └─ Mark ORANGE - "Expires: {date}"
   │  │  │  └─ If expiryDate < TODAY:
   │  │  │     └─ Mark RED - "EXPIRED"
   │  │  │
   │  │  └─ Checkbox: Pharmacist approves this item
   │  │
   │  └─ APPROVAL OPTIONS:
   │     ├─ Dispense as-is (quantity = prescribed)
   │     ├─ Modify quantity (if stock insufficient)
   │     ├─ Substitute product (if unavailable, suggest alternative)
   │     └─ Reject item (if contraindicated or unavailable)
   │
   ├─ On APPROVE ALL:
   │  ├─ All items status = READY_TO_DISPENSE
   │  └─ Navigate to dispensing workflow
   │
   └─ On HOLD/REJECT:
      ├─ Send message to doctor requesting revision
      └─ Prescription stays in PENDING queue


3. DISPENSING WORKFLOW
└─ Dispensing workflow (in-app or external)
   ├─ User: Pharmacy Technician / Cashier
   ├─ For each approved item:
   │  ├─ Physically retrieve product from shelf
   │  ├─ Verify: Product name, strength, expiry date
   │  ├─ Count quantity to dispense
   │  ├─ Scan barcode (if available) to populate:
   │  │  ├─ Product ID
   │  │  ├─ Batch number
   │  │  ├─ Expiry date
   │  │  └─ Unit price
   │  ├─ Confirm dispensing quantity
   │  └─ Print label with:
   │     ├─ Patient name
   │     ├─ Drug name + strength
   │     ├─ Quantity
   │     ├─ Frequency (e.g., "1 tablet BD")
   │     ├─ Duration (e.g., "7 days")
   │     ├─ Instructions (e.g., "Take with food")
   │     └─ Doctor name + date
   │
   ├─ On CONFIRM DISPENSE:
   │  ├─ Update PrescriptionItem
   │  │  ├─ prescriptionItem.quantityDispensed = actual_quantity
   │  │  ├─ prescriptionItem.dispensedBy = currentUser.id (pharmacist)
   │  │  ├─ prescriptionItem.dispensedAt = now
   │  │  └─ prescriptionItem.status = DISPENSED
   │  │
   │  ├─ Deduct from InventoryItem
   │  │  ├─ inventoryItem.quantity -= quantityDispensed
   │  │  ├─ inventoryItem.lastDispensedAt = now
   │  │  └─ If quantity < min_stock_level:
   │  │     └─ Create InventoryAlert (reorder needed)
   │  │
   │  ├─ Create DispenseEntry (audit trail)
   │  │  ├─ dispenseEntry.prescriptionId = prescription.id
   │  │  ├─ dispenseEntry.productId = product.id
   │  │  ├─ dispenseEntry.quantityDispensed = qty
   │  │  ├─ dispenseEntry.dispensedBy = pharmacist.id
   │  │  ├─ dispenseEntry.timestamp = now
   │  │  └─ dispenseEntry.patientId = patient.id
   │  │
   │  └─ Check: All items dispensed?
   │     ├─ If YES: Prescription.status = FULLY_DISPENSED
   │     └─ If NO (partial): Prescription.status = PARTIALLY_DISPENSED
   │
   └─ Result: Ready for patient pickup + billing


4. ADD PRICE & BILLING
└─ Billing/Payment Screen (integrated with dispensing)
   ├─ Display dispense summary:
   │  ├─ Dispense items table
   │  │  ├─ Columns: Product | Qty | UnitPrice (from InventoryItem) | Total
   │  │  └─ Calculate line totals
   │  │
   │  ├─ Subtotal = Sum of all line totals
   │  ├─ Taxes (if applicable) = subtotal × tax_rate
   │  ├─ Total = subtotal + taxes
   │  └─ Display grand total
   │
   ├─ Payment Method:
   │  ├─ Cash
   │  ├─ Card (if terminal linked)
   │  ├─ Insurance
   │  └─ Credit/Account
   │
   ├─ On FINALIZE PAYMENT:
   │  ├─ Create Sale record
   │  │  ├─ sale.organizationId = org.id
   │  │  ├─ sale.patientId = patient.id (optional, for tracking)
   │  │  ├─ sale.saleType = PRESCRIPTION (vs POS direct sale)
   │  │  ├─ sale.prescriptionId = prescription.id
   │  │  ├─ sale.totalAmount = subtotal + taxes
   │  │  ├─ sale.paymentMethod = selected method
   │  │  ├─ sale.createdBy = pharmacist.id
   │  │  ├─ sale.status = COMPLETED
   │  │  └─ sale.timestamp = now
   │  │
   │  ├─ For each SaleItem:
   │  │  ├─ saleItem.saleId = sale.id
   │  │  ├─ saleItem.productId = product.id
   │  │  ├─ saleItem.quantity = qty_dispensed
   │  │  ├─ saleItem.unitPrice = price_at_time_of_sale
   │  │  ├─ saleItem.lineTotal = qty × unitPrice
   │  │  └─ saleItem.batchNumber (if tracked)
   │  │
   │  └─ Prescription.status = FULLY_DISPENSED (if all approved items filled)
   │
   └─ Print:
      ├─ Patient receipt
      ├─ Pharmacy copy
      └─ Accounting/Audit copy


5. INVENTORY MANAGEMENT
└─ InventoryScreen.tsx
   ├─ User: Inventory Manager, Pharmacy Admin
   ├─ Display:
   │  ├─ All Products + current stock levels
   │  │  ├─ Grouped by category (antibiotics, analgesics, etc.)
   │  │  ├─ Columns: Name | SKU | Stock | Min | Max | Status
   │  │  └─ Status badges:
   │  │     ├─ 🔴 OUT_OF_STOCK (qty = 0)
   │  │     ├─ 🟡 LOW_STOCK (qty < min)
   │  │     ├─ 🟠 EXPIRING_SOON (< 30 days)
   │  │     └─ 🟢 NORMAL (qty between min & max)
   │  │
   │  └─ Alerts summary:
   │     ├─ X products out of stock
   │     ├─ Y products expiring soon
   │     └─ Z products low stock
   │
   ├─ Stock Movements:
   │  ├─ Receive from Supplier
   │  │  ├─ Invoice #
   │  │  ├─ Product + quantity received
   │  │  ├─ Batch # + expiry date
   │  │  ├─ Unit cost
   │  │  └─ On confirm: Update InventoryItem.quantity
   │  │
   │  ├─ Dispense from Prescription (automated, shown above)
   │  │
   │  ├─ Manual Adjustment
   │  │  ├─ Quantity change reason (damaged, expired, stock count discrepancy)
   │  │  ├─ Adjustment quantity (+ or -)
   │  │  └─ Notes
   │  │
   │  └─ Transfer between locations
   │
   └─ Reports:
      ├─ Stock valuation (total inventory value)
      ├─ Pharmacy consumption (by month)
      ├─ Product ABC analysis (fast-movers vs slow)
      └─ Supplier performance


6. POINT OF SALE (POS)
└─ POSScreen.tsx
   ├─ User: Cashier, Pharmacy Technician (non-prescription sales)
   ├─ Use case: Direct sales to public (OTC products)
   │
   ├─ Workflow:
   │  ├─ Scan product barcode OR search by name/sku
   │  ├─ Specify quantity
   │  ├─ Add to cart
   │  ├─ Repeat until done
   │  ├─ Calculate total = sum of (qty × unitPrice for each item)
   │  ├─ Process payment (cash, card, etc.)
   │  ├─ Create Sale
   │  │  ├─ sale.organizationId = org.id
   │  │  ├─ sale.saleType = POS (vs PRESCRIPTION)
   │  │  ├─ sale.patientId = null (or optional for OTC tracking)
   │  │  ├─ sale.prescriptionId = null
   │  │  ├─ sale.totalAmount = calculated
   │  │  ├─ sale.createdBy = cashier.id
   │  │  └─ sale.status = COMPLETED
   │  └─ Deduct inventory
   │     └─ inventoryItem.quantity -= qty for each item
   │
   └─ Difference from Prescription:
      ├─ No patient allergies check
      ├─ No doctor approval needed
      ├─ No encounter link
      └─ Direct OTC sales
```

---

## 5. Occupational Health Module: Enterprise → Worker → Medical Exam → Fitness

### 5.1 Enterprise Registration → Worker Enrollment → Periodic Medical Exams

**File Locations:**
- Dashboard: [src/modules/occupational-health/screens/OccHealthDashboard.tsx](src/modules/occupational-health/screens/OccHealthDashboard.tsx)

**Workflow:**

```tsx
1. ENTERPRISE SETUP
└─ Enterprise creation (admin function)
   ├─ Input:
   │  ├─ Company name
   │  ├─ Sector selection (16 options: mining, construction, banking, etc.)
   │  ├─ RCCM (business registration #)
   │  ├─ NIF (tax ID)
   │  ├─ Contact info
   │  └─ Contract dates
   │
   ├─ On Save:
   │  ├─ Create Enterprise record
   │  │  ├─ enterprise.sector = selected sector
   │  │  ├─ enterprise.risk_level = derived from sector
   │  │  │  └─ mining: very_high (exam freq 12 months)
   │  │  │  └─ construction: very_high (exam freq 12 months)
   │  │  │  └─ banking: moderate (exam freq 24-36 months)
   │  │  ├─ enterprise.rccm = unique ID
   │  │  └─ enterprise.mandatoryTestTypes = based on sector
   │  │     (e.g., mining: [audiometry, spirometry, blood_metals])
   │  │
   │  └─ Result: Enterprise registered


2. WORK SITE REGISTRATION
└─ WorkSite creation (associated with enterprise)
   ├─ Input:
   │  ├─ Site name + location
   │  ├─ Description
   │  ├─ Worker count estimate
   │  ├─ Remote site? (Y/N)
   │  └─ Has on-site medical facility?
   │
   ├─ On Save:
   │  ├─ Create WorkSite record
   │  │  ├─ workSite.enterprise = enterprise.id
   │  │  └─ workSite.name
   │  │
   │  └─ Result: WorkSite registered


3. WORKER ENROLLMENT
└─ Worker registration screen
   ├─ User: Occ Health Admin, HR Manager
   ├─ Input:
   │  ├─ Employee ID (from company)
   │  ├─ First + Last name
   │  ├─ DOB
   │  ├─ Gender
   │  ├─ Job category (from dropdown)
   │  ├─ Job title (free text)
   │  ├─ Employment status (ACTIVE, ON_LEAVE, TERMINATED)
   │  ├─ Hire date
   │  ├─ Work site assignment (optional)
   │  ├─ Exposure risks (multi-select based on job + enterprise sector)
   │  ├─ PPE requirements (auto-populated from sector)
   │  ├─ Medical history
   │  │  ├─ Allergies
   │  │  ├─ Chronic conditions
   │  │  └─ Current medications
   │  └─ PPE items issued (checkboxes)
   │
   ├─ Auto-calculated fields:
   │  ├─ next_exam_due = hire_date + enterprise.exam_frequency_months
   │  ├─ exam_frequency_months = based on enterprise sector risk level
   │  └─ required_tests = sector-specific tests
   │
   ├─ On Save:
   │  ├─ Create Worker record
   │  │  ├─ worker.employee_id = unique per enterprise
   │  │  ├─ worker.enterprise = enterprise.id
   │  │  ├─ worker.workSite = worksite.id (optional)
   │  │  ├─ worker.exposureRisks = selected risks
   │  │  ├─ worker.ppeRequired = required items
   │  │  ├─ worker.ppeProvided = issued items
   │  │  ├─ worker.nextExamDue = calculated
   │  │  ├─ worker.currentFitnessStatus = FIT (initial)
   │  │  └─ worker.createdBy = currentUser.id
   │  │
   │  └─ Result: Worker enrolled, scheduled for pre-employment exam


4. MEDICAL EXAMINATION
└─ MedicalExamination workflow
   ├─ User: Occupational Health Physician
   ├─ Trigger: 
   │  ├─ Pre-employment (worker enrolled)
   │  ├─ Periodic (next_exam_due date reached)
   │  ├─ Special (after injury/incident, job change)
   │  └─ Return-to-work (after leave/illness)
   │
   ├─ Exam Steps:
   │  ├─ VITAL SIGNS (similar to hospital triage)
   │  │  ├─ Temperature, BP, HR, RR, O2sat, weight, height
   │  │  └─ Calculates: BMI, BP_category, abnormal flags
   │  │
   │  ├─ PHYSICAL EXAMINATION
   │  │  ├─ General appearance
   │  │  ├─ Body systems review
   │  │  ├─ Occupational health specific findings
   │  │  └─ Free-text clinical notes
   │  │
   │  ├─ SECTOR-SPECIFIC TESTS (based on enterprise.sector)
   │  │  ├─ Mining sector → REQUIRES:
   │  │  │  ├─ AudiometerTest (hearing damage from noise)
   │  │  │  ├─ SpirometryTest (lung capacity, silica damage)
   │  │  │  ├─ ChestXray (pneumoconiosis)
   │  │  │  └─ BloodMetals (lead, mercury, cadmium levels)
   │  │  │
   │  │  ├─ Banking sector → REQUIRES:
   │  │  │  ├─ VisionTest (screen time eye strain)
   │  │  │  ├─ ErgonomicAssessment (desk posture/equipment)
   │  │  │  └─ MentalHealthScreening (stress assessment)
   │  │  │
   │  │  └─ Construction → REQUIRES:
   │  │     ├─ AudiometerTest
   │  │     ├─ SpirometryTest
   │  │     └─ VisionTest
   │  │
   │  └─ FINAL ASSESSMENT
   │     ├─ Summary of findings
   │     ├─ Occupational disease assessment (if any symptoms found)
   │     └─ Fitness determination (see step 5)
   │
   ├─ On COMPLETE EXAM:
   │  ├─ Create MedicalExamination record
   │  │  ├─ medExam.worker = worker.id
   │  │  ├─ medExam.examType = PREPLACEMENT | PERIODIC | SPECIAL | RETURN_TO_WORK
   │  │  ├─ medExam.examDate = today
   │  │  ├─ medExam.examiningDoctor = currentUser.id
   │  │  ├─ medExam.status = COMPLETED
   │  │  └─ medExam.findingsText = clinical notes
   │  │
   │  ├─ Create associated records:
   │  │  ├─ VitalSigns (linked to medExam)
   │  │  ├─ PhysicalExamination
   │  │  ├─ SectorSpecificTest results (audiometry, spirometry, etc.)
   │  │  └─ [OccupationalDisease] if indicated
   │  │
   │  └─ Result: Proceed to fitness certification


5. FITNESS CERTIFICATION
└─ FitnessCertificate generation
   ├─ Physician determines fitness level:
   │  ├─ FIT: Can perform job without restrictions
   │  ├─ FIT_WITH_RESTRICTIONS: Can work, but with limitations
   │  ├─ TEMPORARILY_UNFIT: Cannot work for specified period
   │  └─ PERMANENTLY_UNFIT: Cannot perform this job
   │
   ├─ If restrictions:
   │  ├─ Specify restriction text (e.g., "No heights > 5m")
   │  ├─ Duration (e.g., "3 months")
   │  └─ Review date
   │
   ├─ If unfit:
   │  ├─ Reason code
   │  ├─ Medical condition details
   │  └─ Recommendation (job retraining, long-term leave, termination consideration)
   │
   ├─ On ISSUE CERTIFICATE:
   │  ├─ Create FitnessCertificate record
   │  │  ├─ cert.medicalExamination = medExam.id
   │  │  ├─ cert.worker = worker.id
   │  │  ├─ cert.fitnessDecision = selected level
   │  │  ├─ cert.restrictions = text (if applicable)
   │  │  ├─ cert.validFrom = today
   │  │  ├─ cert.validUntil = today + exam_frequency_months
   │  │  ├─ cert.issuedBy = physician.id
   │  │  ├─ cert.issuedAt = today
   │  │  └─ cert.status = ACTIVE
   │  │
   │  ├─ Update Worker
   │  │  ├─ worker.currentFitnessStatus = fitnessDecision
   │  │  ├─ worker.fitnessRestrictions = restrictions text
   │  │  ├─ worker.nextExamDue = validUntil (auto-schedule next exam)
   │  │  └─ worker.lastExamDate = today
   │  │
   │  └─ Result: Certificate issued, worker can be deployed
   │
   └─ Output:
      ├─ Generate PDF certificate
      ├─ Send to enterprise HR
      └─ Send copy to worker


6. INCIDENT TRACKING
└─ WorkplaceIncident reporting
   ├─ User: Safety Officer, HR
   ├─ Incident types:
   │  ├─ ACCIDENT (injury occurred)
   │  ├─ NEAR_MISS (potential for injury)
   │  └─ OCCUPATIONAL_DISEASE (work-related illness)
   │
   ├─ Input:
   │  ├─ Incident type
   │  ├─ Date + time
   │  ├─ Location (work site)
   │  ├─ Description
   │  ├─ Injured workers (M2M, multi-seect)
   │  ├─ Witnesses (M2M, multi-select)
   │  ├─ Severity (minor, serious, catastrophic)
   │  ├─ Immediate actions taken
   │  └─ Root cause analysis (when investigation complete)
   │
   ├─ On SAVE:
   │  ├─ Create WorkplaceIncident
   │  │  ├─ incident.enterprise = enterprise.id
   │  │  ├─ incident.workSite = worksite.id
   │  │  ├─ incident.category = selected type
   │  │  ├─ incident.injuredWorkers = M2M set
   │  │  ├─ incident.witnesses = M2M set
   │  │  ├─ incident.status = REPORTED
   │  │  ├─ incident.reportedBy = currentUser.id
   │  │  └─ incident.reportedAt = now
   │  │
   │  └─ For each injured worker:
   │     ├─ [Optional] Create OccupationalDisease if disease-related
   │     └─ [Optional] Schedule special medical exam for follow-up
   │
   └─ Status Flow: REPORTED → INVESTIGATING → RESOLVED


7. OCC HEALTH DATA FLOWS (Summary)
└─ Key relationships:
   Enterprise 1 ── many ── Worker
                     ├─ each Worker has exposures + PPE
                     ├─ each Worker has medical exams
                     └─ each Worker has fitness status
   
   Worker 1 ── many ── MedicalExamination
                    ├─ each exam has VitalSigns
                    ├─ each exam has sector-specific tests
                    └─ each exam may have occupational disease findings
   
   MedicalExamination 1 ── 1 ── FitnessCertificate
                           ├─ certification level (fit/unfit)
                           ├─ restrictions (if any)
                           └─ validity until next_exam_due
   
   Enterprise 1 ── many ── WorkplaceIncident
                       ├─ many ── Worker (injured)
                       └─ many ── Worker (witness)
   
   Worker 1 ── many ── OccupationalDisease
                    ├─ casual determination (certain/probable/possible)
                    ├─ disease type
                    └─ case status
```

---

## 6. Key Data Models in Frontend

### 6.1 Redux Store (Authentication State)

**File:** [src/store/slices/authSlice.ts](src/store/slices/authSlice.ts)

```typescript
interface AuthState {
  user: User | null;                    // Logged-in user
  organization: Organization | null;    // User's organization
  token: string | null;                 // JWT token
  isLoading: boolean;
  error: string | null;
  activeModules: ModuleType[];          // HOSPITAL, PHARMACY, OCC_HEALTH
  userModuleAccess: UserModuleAccess[]  // Feature-level permissions
}

// Actions:
export const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => { state.user = action.payload; },
    setOrganization: (state, action) => { state.organization = action.payload; },
    setToken: (state, action) => { state.token = action.payload; },
    setActiveModules: (state, action) => { state.activeModules = action.payload; },
    logout: (state) => { 
      state.user = null;
      state.token = null;
      state.activeModules = [];
    }
  }
});
```

### 6.2 TypeScript Models

**Patient Model:**
```typescript
export interface Patient {
  id: string;
  patientNumber: string;        // P{YY}{RANDOM}
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  nationalId?: string;
  bloodType?: string;           // A+, O-, etc.
  allergies: string[];          // JSON array in backend
  chronicConditions: string[]; // JSON array
  currentMedications: string[]; // JSON array
  insuranceProvider?: string;
  insuranceNumber?: string;
  address: string;
  city: string;
  country: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DECEASED';
  registrationDate: string;
  lastVisit?: string;
  notes?: string;
  metadata?: Record<string, any>;
}
```

**Encounter Model:**
```typescript
export interface Encounter {
  id: string;
  encounterNumber: string;      // E{YY}{RANDOM}
  patient: string;              // FK to Patient
  organization: string;         // FK to Organization
  attendingPhysician: string;   // FK to User (Doctor)
  nursingStaff: string[];       // M2M to User (Nurses)
  encounterType: 'outpatient' | 'consultation' | 'inpatient' | 'emergency';
  status: 'registered' | 'in_triage' | 'in_consultation' | 'admitted' | 'completed';
  chiefComplaint?: string;
  assessment?: string;          // Diagnosis
  plan?: string;                // Treatment plan
  priority?: 'routine' | 'semi_urgent' | 'urgent' | 'emergency';
  admissionDate: string;
  dischargeDate?: string;
  createdBy: string;            // FK to User
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Prescription Model:**
```typescript
export interface Prescription {
  id: string;
  prescriptionNumber: string;   // RX{YY}{RANDOM}
  patient: string;              // FK to Patient
  doctor: string;               // FK to User
  encounter: string;            // FK to Encounter (CRITICAL LINK)
  organization: string;         // FK to Organization
  date: string;
  status: 'PENDING' | 'PARTIALLY_DISPENSED' | 'FULLY_DISPENSED' | 'CANCELLED' | 'EXPIRED';
  items: PrescriptionItem[];    // Array of items
  totalItems: number;
  itemsDispensed: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  product: string;              // FK to Product
  quantityPrescribed: number;
  quantityDispensed: number;
  frequency: string;            // OD, BD, TID, QID
  duration: number;             // in days
  instructions: string;
  status: 'PENDING' | 'DISPENSED' | 'PARTIAL' | 'CANCELLED';
  dispensedBy?: string;         // FK to User (Pharmacist)
  dispensedAt?: string;
}
```

**Worker Model (Occ Health):**
```typescript
export interface Worker {
  id: string;
  employeeId: string;           // Unique per enterprise
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  enterprise: string;           // FK to Enterprise
  workSite?: string;            // FK to WorkSite (optional)
  jobCategory: string;
  jobTitle: string;
  hireDate: string;
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  exposureRisks: string[];      // e.g., ["silica_dust", "noise"]
  ppeRequired: string[];        // Required PPE types
  ppeProvided: string[];        // Actually provided
  currentFitnessStatus: 'FIT' | 'FIT_WITH_RESTRICTIONS' | 'UNFIT';
  fitnessRestrictions?: string; // e.g., "No heights > 5m"
  nextExamDue: string;          // Calculated from sector
  lastExamDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. Frontend-Backend Integration Points

### 7.1 Authorization Header

```typescript
// All API requests include JWT token from Redux store

const headers = {
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json',
  'X-Organization-ID': organizationId  // For multi-tenant filtering
};

fetch('https://api.backend.com/api/v1/hospital/encounters/', {
  method: 'GET',
  headers,
})
```

### 7.2 Response Interceptor (Example)

```typescript
// Auto-deserialize nested objects

function deserializeEncounter(data: any): Encounter {
  return {
    ...data,
    patient: data.patient_id,                    // Flatten nested IDs
    attendingPhysician: data.attending_physician_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
```

### 7.3 Offline-First: Local Database

```typescript
// DatabaseService caches all records locally in SQLite

const db = DatabaseService.getInstance();

// Save locally
await db.savePatient(patient);

// Query locally
const patient = await db.getPatient(patientId);

// Sync with backend when online
if (isOnline && lastSyncTime > 5minutes) {
  await syncPatientData();
}
```

---

## 8. Summary: Frontend Relationship Map

| Relation | Frontend Storage | Backend API | Use Case |
|----------|------------------|-------------|----------|
| **User → Organization** | Redux store | POST /auth/login | Auth context, org-level filtering |
| **User → Patient** | Not direct | Via Encounter | Doctor views their patients through encounters |
| **Patient → Encounter** | SQLite (cached) | GET /encounters/?patient={id} | Patient detail screen shows all encounters |
| **Encounter → VitalSigns** | SQLite (cached) | GET /encounters/{id}/vital-signs | Triage screen records vitals linked to encounter |
| **Encounter → Prescription** | SQLite (cached) | GET /prescriptions/?encounter={id} | Hospital consultation screen shows prescriptions from encounter |
| **Prescription → Product** | SQLite (cached) | GET /inventory/products/?id={} | Pharmacy checks stock before dispensing |
| **Enterprise → Worker** | SQLite (cached) | GET /workers/?enterprise={id} | Occ Health lists workers for enterprise |
| **Worker → MedExam** | SQLite (cached) | GET /medical-exams/?worker={id} | Occ Health shows exam history for worker |
| **MedExam → FitnessCert** | SQLite (cached) | GET /certificates/?exam={id} | Download/print fitness certificate |

---

## Conclusion

The frontend mirrors the backend data structure perfectly:

1. **Authentication** drives everything (JWT token in Authorization header)
2. **User role** determines which modules/screens are available
3. **Patient-centric data** flows through encounters → prescriptions → pharmacy
4. **Worker-centric data** flows through exams → fitness certificates → incidents
5. **Offline-first** SQLite keeps data responsive even without network
6. **Redux store** maintains auth state for permission checks throughout app

The key integration point is the **Encounter-Prescription link** in Hospital module, which bridges Doctor → Patient → Pharmacist, and the **Worker-Enterprise link** in Occupational Health module for workplace health management.
