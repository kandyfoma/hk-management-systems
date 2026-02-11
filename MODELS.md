# HK Management Systems — Data Models Reference

> Auto-generated model documentation for the HK Management Systems healthcare platform.
> All models live under `src/models/`.

---

## Table of Contents

1. [User](#1-user)
2. [Patient](#2-patient)
3. [Drug](#3-drug)
4. [Inventory](#4-inventory)
   - [Supplier](#41-supplier)
   - [Product](#42-product)
   - [InventoryItem](#43-inventoryitem)
   - [InventoryBatch](#44-inventorybatch)
   - [StockMovement](#45-stockmovement)
   - [PurchaseOrder](#46-purchaseorder)
   - [PurchaseOrderItem](#47-purchaseorderitem)
   - [InventoryAlert](#48-inventoryalert)
   - [StockCount](#49-stockcount)
5. [Sale (POS)](#5-sale-pos)
   - [Sale](#51-sale)
   - [SaleItem](#52-saleitem)
   - [SalePayment](#53-salepayment)
   - [CartItem & CartState](#54-cartitem--cartstate)
   - [CartTotals](#55-carttotals)

---

## 1. User

**File:** `src/models/User.ts`

Core user/staff identity model used across both hospital and pharmacy modules.

### Interface: `User`

| Field                | Type        | Required | Description                          |
|----------------------|-------------|----------|--------------------------------------|
| `id`                 | `string`    | ✅       | Primary key                          |
| `organizationId`     | `string`    | ✅       | FK → Organization                    |
| `phone`              | `string`    | ✅       | Phone number (login credential)      |
| `firstName`          | `string`    | ✅       | First name                           |
| `lastName`           | `string`    | ✅       | Last name                            |
| `primaryRole`        | `UserRole`  | ✅       | Staff role                           |
| `department`         | `string`    | ❌       | Department assignment                |
| `employeeId`         | `string`    | ❌       | Internal employee number             |
| `professionalLicense`| `string`    | ❌       | Medical/pharmaceutical license #     |
| `isActive`           | `boolean`   | ✅       | Account active flag                  |
| `lastLogin`          | `string`    | ❌       | ISO date of last login               |
| `createdAt`          | `string`    | ✅       | ISO creation timestamp               |
| `updatedAt`          | `string`    | ❌       | ISO update timestamp                 |
| `metadata`           | `Record<string, any>` | ❌ | Extensible JSON metadata         |

### Enum: `UserRole`

| Value                | Description              |
|----------------------|--------------------------|
| `admin`              | Super administrator      |
| `hospital_admin`     | Hospital administrator   |
| `pharmacy_admin`     | Pharmacy administrator   |
| `doctor`             | Doctor                   |
| `nurse`              | Nurse                    |
| `pharmacist`         | Pharmacist               |
| `pharmacy_tech`      | Pharmacy technician      |
| `receptionist`       | Front-desk receptionist  |
| `lab_technician`     | Laboratory technician    |
| `cashier`            | Cashier                  |
| `inventory_manager`  | Inventory manager        |

### Enum: `Permission` (19 values)

`manage_users` · `view_patients` · `manage_patients` · `prescribe_medication` · `dispense_medication` · `manage_inventory` · `view_reports` · `manage_billing` · `manage_appointments` · `access_lab_results` · `manage_system_settings` · `manage_licenses` · `view_analytics` · `manage_suppliers` · `access_pos` · `manage_prescriptions` · `access_medical_records` · `manage_wards` · `view_financial_reports`

### Utility: `UserUtils`

| Method                             | Returns       | Description                              |
|------------------------------------|---------------|------------------------------------------|
| `getFullName(user)`                | `string`      | "First Last"                             |
| `getRoleDisplayName(role)`         | `string`      | Human-readable role label                |
| `getDefaultPermissions(role)`      | `Permission[]`| Role-based default permission set        |

### CRUD Interfaces

- `UserCreate` — Omits `id`, `createdAt`, `isActive` (auto-generated)
- `UserUpdate` — Partial; protects `id`, `organizationId`, `createdAt`
- `LoginCredentials` — `{ username, password }`
- `AuthState` — `{ isAuthenticated, user?, token? }`

---

## 2. Patient

**File:** `src/models/Patient.ts`

Full patient record with demographics, contact info, medical data, and insurance.

### Interface: `Patient`

| Field                     | Type          | Required | Description                        |
|---------------------------|---------------|----------|------------------------------------|
| `id`                      | `string`      | ✅       | Primary key                        |
| `firstName`               | `string`      | ✅       | First name                         |
| `lastName`                | `string`      | ✅       | Last name                          |
| `middleName`              | `string`      | ❌       | Middle name                        |
| `dateOfBirth`             | `string`      | ✅       | ISO date                           |
| `gender`                  | `Gender`      | ✅       | `male` · `female` · `other`       |
| `nationalId`              | `string`      | ❌       | National ID card number            |
| `passportNumber`          | `string`      | ❌       | Passport number                    |
| `phone`                   | `string`      | ❌       | Phone                              |
| `email`                   | `string`      | ❌       | Email                              |
| `address`                 | `string`      | ❌       | Street address                     |
| `city`                    | `string`      | ❌       | City                               |
| `country`                 | `string`      | ❌       | Country                            |
| `emergencyContactName`    | `string`      | ❌       | Emergency contact                  |
| `emergencyContactPhone`   | `string`      | ❌       | Emergency phone                    |
| `emergencyContactRelation`| `string`      | ❌       | Relation to patient                |
| `bloodType`               | `BloodType`   | ❌       | A± / B± / AB± / O±                |
| `allergies`               | `string[]`    | ✅       | Known allergies                    |
| `chronicConditions`       | `string[]`    | ✅       | Chronic conditions                 |
| `currentMedications`      | `string[]`    | ✅       | Active medications                 |
| `insuranceProvider`       | `string`      | ❌       | Insurance company name             |
| `insuranceNumber`         | `string`      | ❌       | Insurance policy number            |
| `patientNumber`           | `string`      | ✅       | Unique hospital ID (`P25XXXX`)     |
| `registrationDate`        | `string`      | ✅       | ISO registration date              |
| `lastVisit`               | `string`      | ❌       | ISO date of most recent visit      |
| `status`                  | `PatientStatus`| ✅      | `active` · `inactive` · `deceased` |
| `notes`                   | `string`      | ❌       | Free-text notes                    |
| `createdAt`               | `string`      | ✅       | ISO creation timestamp             |
| `updatedAt`               | `string`      | ❌       | ISO update timestamp               |
| `metadata`                | `Record<string, any>` | ❌ | Extensible JSON metadata       |

### Interface: `MedicalRecord`

| Field            | Type          | Required | Description                    |
|------------------|---------------|----------|--------------------------------|
| `id`             | `string`      | ✅       | Primary key                    |
| `patientId`      | `string`      | ✅       | FK → Patient                   |
| `visitDate`      | `string`      | ✅       | ISO date of visit              |
| `chiefComplaint` | `string`      | ✅       | Main reason for visit          |
| `symptoms`       | `string[]`    | ✅       | Symptom list                   |
| `diagnosis`      | `string`      | ❌       | Diagnosis                      |
| `treatment`      | `string`      | ❌       | Treatment plan                 |
| `medications`    | `string[]`    | ✅       | Prescribed medications         |
| `followUpDate`   | `string`      | ❌       | Follow-up ISO date             |
| `doctorId`       | `string`      | ✅       | FK → User (doctor)             |
| `notes`          | `string`      | ❌       | Clinical notes                 |
| `vitals`         | `VitalSigns`  | ❌       | Vitals snapshot                |
| `createdAt`      | `string`      | ✅       | ISO timestamp                  |
| `updatedAt`      | `string`      | ❌       | ISO timestamp                  |

### Interface: `VitalSigns`

| Field                     | Type     | Unit      |
|---------------------------|----------|-----------|
| `temperature`             | `number` | °C        |
| `bloodPressureSystolic`   | `number` | mmHg      |
| `bloodPressureDiastolic`  | `number` | mmHg      |
| `heartRate`               | `number` | BPM       |
| `respiratoryRate`         | `number` | /min      |
| `oxygenSaturation`        | `number` | %         |
| `weight`                  | `number` | kg        |
| `height`                  | `number` | cm        |
| `bmi`                     | `number` | kg/m²     |
| `painScale`               | `number` | 1–10      |

### Utility: `PatientUtils`

| Method                         | Returns     | Description                           |
|--------------------------------|-------------|---------------------------------------|
| `getFullName(patient)`         | `string`    | Full name including middle name       |
| `getAge(patient)`              | `number`    | Age in years                          |
| `generatePatientNumber()`      | `string`    | `PYYXXXX` format                      |
| `createPatient(data)`          | `Patient`   | Factory with auto-generated fields    |
| `updatePatient(patient, upd)`  | `Patient`   | Immutable update with timestamp       |
| `calculateBMI(weight, height)` | `number`    | BMI to 1 decimal place               |

---

## 3. Drug

**File:** `src/models/Drug.ts`

Legacy/lightweight drug model. For full inventory, see [Product](#42-product).

### Interface: `Drug`

| Field                | Type        | Required | Description                        |
|----------------------|-------------|----------|------------------------------------|
| `id`                 | `string`    | ✅       | Primary key                        |
| `name`               | `string`    | ✅       | Drug name                          |
| `genericName`        | `string`    | ❌       | INN / generic name                 |
| `brandName`          | `string`    | ❌       | Brand / commercial name            |
| `manufacturer`       | `string`    | ❌       | Manufacturer                       |
| `dosageForm`         | `string`    | ✅       | tablet, syrup, injection, etc.     |
| `strength`           | `string`    | ✅       | e.g. "500mg"                       |
| `description`        | `string`    | ❌       | Free-text description              |
| `indication`         | `string`    | ❌       | Therapeutic indication             |
| `contraindication`   | `string`    | ❌       | Contraindications                  |
| `sideEffects`        | `string`    | ❌       | Known side effects                 |
| `dosageInstructions` | `string`    | ❌       | Dosage instructions                |
| `activeIngredients`  | `string[]`  | ✅       | Active ingredients list            |
| `category`           | `string`    | ❌       | Drug category                      |
| `requiresPrescription`| `boolean`  | ✅       | Prescription-only flag             |
| `isControlled`       | `boolean`   | ✅       | Controlled substance flag          |
| `unitPrice`          | `number`    | ❌       | Price per unit                     |
| `barcode`            | `string`    | ❌       | Barcode                            |
| `createdAt`          | `string`    | ✅       | ISO creation timestamp             |
| `updatedAt`          | `string`    | ❌       | ISO update timestamp               |
| `metadata`           | `Record<string, any>` | ❌ | Extensible JSON metadata       |

### Utility: `DrugUtils`

| Method                        | Returns   | Description                          |
|-------------------------------|-----------|--------------------------------------|
| `getDisplayName(drug)`        | `string`  | Brand name or fallback to name       |
| `getFullDescription(drug)`    | `string`  | "Name Strength DosageForm"           |
| `hasActiveIngredients(drug)`  | `boolean` | Has at least one active ingredient   |
| `createDrug(data)`            | `Drug`    | Factory with auto-generated fields   |
| `updateDrug(drug, updates)`   | `Drug`    | Immutable update with timestamp      |

---

## 4. Inventory

**File:** `src/models/Inventory.ts` (778 lines)

Comprehensive pharmacy-grade inventory management. This is the largest model file.

### Entity Relationship Diagram

```
Supplier ──┬── 1:N ── Product ──┬── 1:N ── InventoryItem ── 1:N ── StockMovement
           └── 1:N ── PurchaseOrder ── 1:N ── PurchaseOrderItem
                                 └── 1:N ── InventoryBatch
                      InventoryAlert (references Product, InventoryItem, Batch)
                      StockCount ── 1:N ── StockCountItem
```

---

### 4.1 Supplier

Pharmaceutical supplier / distributor.

| Field             | Type           | Required | Description                      |
|-------------------|----------------|----------|----------------------------------|
| `id`              | `string`       | ✅       | Primary key                      |
| `organizationId`  | `string`       | ✅       | FK → Organization                |
| `name`            | `string`       | ✅       | Supplier company name            |
| `code`            | `string`       | ✅       | Internal supplier code           |
| `contactPerson`   | `string`       | ✅       | Primary contact                  |
| `phone`           | `string`       | ✅       | Phone                            |
| `altPhone`        | `string`       | ❌       | Alternate phone                  |
| `email`           | `string`       | ❌       | Email                            |
| `website`         | `string`       | ❌       | Website                          |
| `address`         | `string`       | ✅       | Street address                   |
| `city`            | `string`       | ✅       | City                             |
| `country`         | `string`       | ✅       | Country                          |
| `taxId`           | `string`       | ❌       | Tax identification number        |
| `licenseNumber`   | `string`       | ❌       | Pharma distribution license      |
| `paymentTerms`    | `PaymentTerms` | ✅       | Payment terms                    |
| `creditLimit`     | `number`       | ❌       | Credit limit                     |
| `currentBalance`  | `number`       | ✅       | Outstanding balance              |
| `currency`        | `string`       | ✅       | CDF / USD / EUR                  |
| `bankName`        | `string`       | ❌       | Bank name                        |
| `bankAccountNumber`| `string`      | ❌       | Bank account                     |
| `rating`          | `number`       | ✅       | 1–5 quality rating               |
| `leadTimeDays`    | `number`       | ✅       | Average delivery time (days)     |
| `isActive`        | `boolean`      | ✅       | Active flag                      |
| `notes`           | `string`       | ❌       | Free-text notes                  |
| `createdAt`       | `string`       | ✅       | ISO timestamp                    |
| `updatedAt`       | `string`       | ❌       | ISO timestamp                    |

**PaymentTerms:** `CASH_ON_DELIVERY` · `NET_7` · `NET_15` · `NET_30` · `NET_60` · `NET_90` · `PREPAID` · `CREDIT`

---

### 4.2 Product

Full pharmaceutical product model (replaces/extends Drug for inventory).

| Field                  | Type                 | Required | Description                         |
|------------------------|----------------------|----------|-------------------------------------|
| `id`                   | `string`             | ✅       | Primary key                         |
| `organizationId`       | `string`             | ✅       | FK → Organization                   |
| `name`                 | `string`             | ✅       | Commercial name                     |
| `genericName`          | `string`             | ❌       | INN (generic name)                  |
| `brandName`            | `string`             | ❌       | Brand name                          |
| `sku`                  | `string`             | ✅       | Stock Keeping Unit (unique/org)     |
| `barcode`              | `string`             | ❌       | EAN-13 / UPC / QR                   |
| `internalCode`         | `string`             | ❌       | Internal pharmacy code              |
| `category`             | `ProductCategory`    | ✅       | Product category                    |
| `subCategory`          | `string`             | ❌       | Sub-category                        |
| `therapeuticClass`     | `string`             | ❌       | ATC classification                  |
| `controlledSubstance`  | `boolean`            | ✅       | Controlled substance flag           |
| `requiresPrescription` | `boolean`            | ✅       | Requires Rx                         |
| `scheduledDrug`        | `ScheduledDrugClass` | ❌       | Schedule I–V                        |
| `dosageForm`           | `DosageForm`         | ✅       | Formulation type                    |
| `strength`             | `string`             | ❌       | e.g. "500mg"                        |
| `unitOfMeasure`        | `UnitOfMeasure`      | ✅       | Smallest dispensing unit            |
| `packSize`             | `number`             | ✅       | Units per pack                      |
| `packType`             | `string`             | ❌       | blister, bottle, box, tube          |
| `activeIngredients`    | `string[]`           | ✅       | Active ingredients                  |
| `concentration`        | `string`             | ❌       | e.g. "10mg/ml"                      |
| `manufacturer`         | `string`             | ✅       | Manufacturer name                   |
| `countryOfOrigin`      | `string`             | ❌       | Country of origin                   |
| `registrationNumber`   | `string`             | ❌       | Drug registration / MA number       |
| `indication`           | `string`             | ❌       | Therapeutic indication              |
| `contraindication`     | `string`             | ❌       | Contraindications                   |
| `sideEffects`          | `string`             | ❌       | Side effects                        |
| `dosageInstructions`   | `string`             | ❌       | Dosage instructions                 |
| `storageConditions`    | `StorageCondition`   | ❌       | Storage requirements                |
| `warnings`             | `string`             | ❌       | Warnings                            |
| `costPrice`            | `number`             | ✅       | Purchase / landed cost per unit     |
| `sellingPrice`         | `number`             | ✅       | Retail price per unit               |
| `wholesalePrice`       | `number`             | ❌       | Wholesale price per unit            |
| `currency`             | `string`             | ✅       | CDF / USD                           |
| `taxRate`              | `number`             | ✅       | Tax percentage                      |
| `marginPercent`        | `number`             | ❌       | Auto-calculated profit margin       |
| `insuranceReimbursable`| `boolean`            | ✅       | Insurance reimbursable              |
| `insuranceCode`        | `string`             | ❌       | NHIS / insurance billing code       |
| `reorderLevel`         | `number`             | ✅       | Reorder alert threshold             |
| `reorderQuantity`      | `number`             | ✅       | Default reorder quantity            |
| `minStockLevel`        | `number`             | ✅       | Absolute minimum stock              |
| `maxStockLevel`        | `number`             | ✅       | Maximum recommended stock           |
| `safetyStockDays`      | `number`             | ✅       | Buffer stock in days                |
| `isActive`             | `boolean`            | ✅       | Active flag                         |
| `isDiscontinued`       | `boolean`            | ✅       | Discontinued flag                   |
| `discontinuedDate`     | `string`             | ❌       | ISO date discontinued               |
| `primarySupplierId`    | `string`             | ❌       | FK → Supplier (preferred)           |
| `alternateSupplierIds` | `string[]`           | ❌       | FK[] → Supplier                     |
| `imageUrl`             | `string`             | ❌       | Product image                       |
| `thumbnailUrl`         | `string`             | ❌       | Thumbnail image                     |
| `tags`                 | `string[]`           | ❌       | Search tags                         |
| `notes`                | `string`             | ❌       | Free-text notes                     |
| `createdAt`            | `string`             | ✅       | ISO creation timestamp              |
| `updatedAt`            | `string`             | ❌       | ISO update timestamp                |
| `metadata`             | `Record<string, any>`| ❌       | Extensible JSON metadata            |

**ProductCategory:** `MEDICATION` · `OTC` · `SUPPLEMENT` · `MEDICAL_DEVICE` · `SURGICAL_SUPPLY` · `CONSUMABLE` · `COSMETIC` · `BABY_CARE` · `PERSONAL_HYGIENE` · `LAB_REAGENT` · `VETERINARY` · `OTHER`

**DosageForm:** `TABLET` · `CAPSULE` · `SYRUP` · `SUSPENSION` · `INJECTION` · `CREAM` · `OINTMENT` · `GEL` · `DROPS` · `INHALER` · `SUPPOSITORY` · `PATCH` · `POWDER` · `SOLUTION` · `SPRAY` · `LOZENGE` · `INFUSION` · `IMPLANT` · `DEVICE` · `OTHER`

**UnitOfMeasure:** `UNIT` · `TABLET` · `CAPSULE` · `ML` · `MG` · `G` · `VIAL` · `AMPOULE` · `BOTTLE` · `BOX` · `PACK` · `STRIP` · `TUBE` · `SACHET` · `PAIR` · `SET`

**StorageCondition:** `ROOM_TEMPERATURE` · `COOL_DRY_PLACE` · `REFRIGERATED` · `FROZEN` · `DEEP_FROZEN` · `PROTECT_FROM_LIGHT` · `PROTECT_FROM_MOISTURE`

**ScheduledDrugClass:** `SCHEDULE_I` – `SCHEDULE_V` · `UNSCHEDULED`

---

### 4.3 InventoryItem

Stock of a specific product at a specific facility/location.

| Field                | Type              | Required | Description                        |
|----------------------|-------------------|----------|------------------------------------|
| `id`                 | `string`          | ✅       | Primary key                        |
| `organizationId`     | `string`          | ✅       | FK → Organization                  |
| `productId`          | `string`          | ✅       | FK → Product                       |
| `facilityId`         | `string`          | ✅       | FK → Pharmacy / Hospital ward      |
| `facilityType`       | `FacilityType`    | ✅       | `PHARMACY` · `HOSPITAL_WARD` · `WAREHOUSE` |
| `quantityOnHand`     | `number`          | ✅       | Physical stock now                 |
| `quantityReserved`   | `number`          | ✅       | Reserved for pending orders        |
| `quantityAvailable`  | `number`          | ✅       | onHand – reserved                  |
| `quantityOnOrder`    | `number`          | ✅       | In open purchase orders            |
| `quantityDamaged`    | `number`          | ✅       | Damaged / quarantined              |
| `quantityExpired`    | `number`          | ✅       | Expired not yet disposed           |
| `shelfLocation`      | `string`          | ❌       | e.g. "A3-R2-S4"                   |
| `binNumber`          | `string`          | ❌       | Specific bin                       |
| `zone`               | `string`          | ❌       | Controlled / Refrigerated / General|
| `averageCost`        | `number`          | ✅       | Weighted average cost              |
| `totalStockValue`    | `number`          | ✅       | onHand × averageCost               |
| `lastPurchasePrice`  | `number`          | ✅       | Last purchase price                |
| `lastPurchaseDate`   | `string`          | ❌       | Last purchase date                 |
| `averageDailyUsage`  | `number`          | ✅       | Rolling average daily usage        |
| `daysOfStockRemaining`| `number`         | ✅       | onHand / dailyUsage                |
| `lastMovementDate`   | `string`          | ❌       | Last stock movement                |
| `lastCountDate`      | `string`          | ❌       | Last physical count                |
| `status`             | `InventoryStatus` | ✅       | Current status                     |
| `isActive`           | `boolean`         | ✅       | Active flag                        |
| `createdAt`          | `string`          | ✅       | ISO creation timestamp             |
| `updatedAt`          | `string`          | ❌       | ISO update timestamp               |

**InventoryStatus:** `IN_STOCK` · `LOW_STOCK` · `OUT_OF_STOCK` · `OVER_STOCK` · `DISCONTINUED` · `QUARANTINED`

---

### 4.4 InventoryBatch

Lot / batch / expiry tracking per product per location.

| Field              | Type          | Required | Description                        |
|--------------------|---------------|----------|------------------------------------|
| `id`               | `string`      | ✅       | Primary key                        |
| `inventoryItemId`  | `string`      | ✅       | FK → InventoryItem                 |
| `productId`        | `string`      | ✅       | FK → Product (denormalised)        |
| `batchNumber`      | `string`      | ✅       | Manufacturer lot number            |
| `serialNumber`     | `string`      | ❌       | Serial number                      |
| `quantity`         | `number`      | ✅       | Current quantity in batch          |
| `initialQuantity`  | `number`      | ✅       | Quantity when received             |
| `costPrice`        | `number`      | ✅       | Purchase cost per unit             |
| `manufacturingDate`| `string`      | ❌       | Manufacturing date                 |
| `expiryDate`       | `string`      | ✅       | Expiry date (critical)             |
| `receivedDate`     | `string`      | ✅       | Date received                      |
| `lastDispensedDate`| `string`      | ❌       | Last dispensed from this batch     |
| `status`           | `BatchStatus` | ✅       | Batch status                       |
| `isQuarantined`    | `boolean`     | ✅       | Quarantine flag                    |
| `quarantineReason` | `string`      | ❌       | Reason for quarantine              |
| `disposalDate`     | `string`      | ❌       | Date disposed                      |
| `disposalMethod`   | `string`      | ❌       | How it was disposed                |
| `disposalApprovedBy`| `string`     | ❌       | FK → User                          |
| `supplierId`       | `string`      | ❌       | FK → Supplier                      |
| `purchaseOrderId`  | `string`      | ❌       | FK → PurchaseOrder                 |
| `invoiceNumber`    | `string`      | ❌       | Invoice number                     |
| `notes`            | `string`      | ❌       | Notes                              |
| `createdAt`        | `string`      | ✅       | ISO creation timestamp             |
| `updatedAt`        | `string`      | ❌       | ISO update timestamp               |

**BatchStatus:** `AVAILABLE` · `RESERVED` · `EXPIRED` · `QUARANTINED` · `RECALLED` · `DAMAGED` · `DISPOSED` · `RETURNED`

---

### 4.5 StockMovement

Immutable audit log — every stock change creates one record.

| Field                  | Type                    | Required | Description                     |
|------------------------|-------------------------|----------|---------------------------------|
| `id`                   | `string`                | ✅       | Primary key                     |
| `organizationId`       | `string`                | ✅       | FK → Organization               |
| `inventoryItemId`      | `string`                | ✅       | FK → InventoryItem              |
| `productId`            | `string`                | ✅       | FK → Product (denormalised)     |
| `batchId`              | `string`                | ❌       | FK → InventoryBatch             |
| `movementType`         | `MovementType`          | ✅       | Type of movement                |
| `direction`            | `'IN' \| 'OUT'`         | ✅       | Stock in or out                 |
| `quantity`             | `number`                | ✅       | Always positive                 |
| `unitCost`             | `number`                | ✅       | Cost at time of movement        |
| `totalCost`            | `number`                | ✅       | quantity × unitCost             |
| `previousBalance`      | `number`                | ✅       | Stock before movement           |
| `newBalance`           | `number`                | ✅       | Stock after movement            |
| `sourceFacilityId`     | `string`                | ❌       | Transfer source                 |
| `destinationFacilityId`| `string`                | ❌       | Transfer destination            |
| `referenceType`        | `MovementReferenceType` | ❌       | What generated this movement    |
| `referenceId`          | `string`                | ❌       | FK → Sale, PO, Rx, etc.        |
| `referenceNumber`      | `string`                | ❌       | Human-readable reference        |
| `performedBy`          | `string`                | ✅       | FK → User                       |
| `approvedBy`           | `string`                | ❌       | FK → User                       |
| `movementDate`         | `string`                | ✅       | When it physically happened     |
| `reason`               | `string`                | ❌       | Reason for movement             |
| `notes`                | `string`                | ❌       | Notes                           |
| `createdAt`            | `string`                | ✅       | ISO creation timestamp          |
| `updatedAt`            | `string`                | ❌       | ISO update timestamp            |

**MovementType:** `PURCHASE_RECEIPT` · `SALE` · `PRESCRIPTION` · `TRANSFER_IN` · `TRANSFER_OUT` · `RETURN_TO_SUPPLIER` · `CUSTOMER_RETURN` · `ADJUSTMENT_IN` · `ADJUSTMENT_OUT` · `DAMAGED` · `EXPIRED` · `DISPOSAL` · `DONATION` · `INITIAL_STOCK` · `PRODUCTION` · `SAMPLE` · `RECALL`

**MovementReferenceType:** `PURCHASE_ORDER` · `SALE_INVOICE` · `PRESCRIPTION` · `TRANSFER_ORDER` · `RETURN_NOTE` · `ADJUSTMENT` · `DISPOSAL_RECORD`

---

### 4.6 PurchaseOrder

Purchase order header.

| Field                 | Type                  | Required | Description                      |
|-----------------------|-----------------------|----------|----------------------------------|
| `id`                  | `string`              | ✅       | Primary key                      |
| `organizationId`      | `string`              | ✅       | FK → Organization                |
| `supplierId`          | `string`              | ✅       | FK → Supplier                    |
| `facilityId`          | `string`              | ✅       | FK → receiving location          |
| `poNumber`            | `string`              | ✅       | Auto-generated PO-YYYYMMDD-XXX  |
| `status`              | `PurchaseOrderStatus` | ✅       | Order status                     |
| `priority`            | `Priority`            | ✅       | LOW · NORMAL · HIGH · URGENT     |
| `orderDate`           | `string`              | ✅       | Order date                       |
| `expectedDeliveryDate`| `string`              | ❌       | Expected delivery                |
| `actualDeliveryDate`  | `string`              | ❌       | Actual delivery                  |
| `subtotal`            | `number`              | ✅       | Subtotal                         |
| `taxAmount`           | `number`              | ✅       | Tax                              |
| `discountAmount`      | `number`              | ✅       | Discount                         |
| `shippingCost`        | `number`              | ✅       | Shipping                         |
| `totalAmount`         | `number`              | ✅       | Grand total                      |
| `currency`            | `string`              | ✅       | Currency                         |
| `paymentStatus`       | `PaymentStatus`       | ✅       | Payment status                   |
| `createdBy`           | `string`              | ✅       | FK → User                        |
| `approvedBy`          | `string`              | ❌       | FK → User                        |
| `notes`               | `string`              | ❌       | Notes                            |
| `createdAt`           | `string`              | ✅       | ISO timestamp                    |
| `updatedAt`           | `string`              | ❌       | ISO timestamp                    |

**PurchaseOrderStatus:** `DRAFT` · `PENDING_APPROVAL` · `APPROVED` · `ORDERED` · `PARTIALLY_RECEIVED` · `RECEIVED` · `CANCELLED` · `RETURNED`

**PaymentStatus:** `UNPAID` · `PARTIALLY_PAID` · `PAID` · `OVERDUE` · `REFUNDED`

---

### 4.7 PurchaseOrderItem

Line items within a purchase order.

| Field             | Type     | Required | Description                           |
|-------------------|----------|----------|---------------------------------------|
| `id`              | `string` | ✅       | Primary key                           |
| `purchaseOrderId` | `string` | ✅       | FK → PurchaseOrder                    |
| `productId`       | `string` | ✅       | FK → Product                          |
| `quantityOrdered` | `number` | ✅       | Quantity ordered                      |
| `quantityReceived`| `number` | ✅       | Quantity received so far              |
| `quantityDamaged` | `number` | ✅       | Quantity received damaged             |
| `quantityReturned`| `number` | ✅       | Quantity returned                     |
| `unitPrice`       | `number` | ✅       | Price per unit on PO                  |
| `discount`        | `number` | ✅       | Per-line discount                     |
| `taxRate`         | `number` | ✅       | Tax %                                 |
| `taxAmount`       | `number` | ✅       | Computed tax                          |
| `lineTotal`       | `number` | ✅       | (qty × price) – discount + tax       |
| `batchNumber`     | `string` | ❌       | Batch # (filled on receipt)           |
| `expiryDate`      | `string` | ❌       | Expiry (filled on receipt)            |
| `status`          | `string` | ✅       | PENDING / PARTIALLY_RECEIVED / RECEIVED / CANCELLED / BACK_ORDERED |
| `notes`           | `string` | ❌       | Notes                                 |
| `createdAt`       | `string` | ✅       | ISO timestamp                         |
| `updatedAt`       | `string` | ❌       | ISO timestamp                         |

---

### 4.8 InventoryAlert

Automated stock alerts.

| Field             | Type         | Required | Description                       |
|-------------------|--------------|----------|-----------------------------------|
| `id`              | `string`     | ✅       | Primary key                       |
| `organizationId`  | `string`     | ✅       | FK → Organization                 |
| `productId`       | `string`     | ✅       | FK → Product                      |
| `inventoryItemId` | `string`     | ❌       | FK → InventoryItem                |
| `batchId`         | `string`     | ❌       | FK → InventoryBatch               |
| `alertType`       | `AlertType`  | ✅       | Alert category                    |
| `severity`        | `Severity`   | ✅       | LOW · MEDIUM · HIGH · CRITICAL   |
| `title`           | `string`     | ✅       | Alert title                       |
| `message`         | `string`     | ✅       | Alert description                 |
| `currentValue`    | `number`     | ❌       | e.g. current stock level          |
| `thresholdValue`  | `number`     | ❌       | e.g. reorder level                |
| `expiryDate`      | `string`     | ❌       | For expiry alerts                 |
| `daysUntilExpiry` | `number`     | ❌       | Days remaining                    |
| `status`          | `AlertStatus`| ✅       | ACTIVE · ACKNOWLEDGED · RESOLVED · DISMISSED · AUTO_RESOLVED |
| `acknowledgedBy`  | `string`     | ❌       | FK → User                         |
| `acknowledgedAt`  | `string`     | ❌       | Acknowledge timestamp             |
| `resolvedBy`      | `string`     | ❌       | FK → User                         |
| `resolvedAt`      | `string`     | ❌       | Resolution timestamp              |
| `resolutionNotes` | `string`     | ❌       | Resolution notes                  |
| `createdAt`       | `string`     | ✅       | ISO creation timestamp            |
| `updatedAt`       | `string`     | ❌       | ISO update timestamp              |

**AlertType:** `LOW_STOCK` · `OUT_OF_STOCK` · `OVER_STOCK` · `EXPIRING_SOON` · `EXPIRED` · `RECALL` · `REORDER_POINT` · `PRICE_CHANGE` · `SLOW_MOVING` · `DAMAGED_STOCK` · `TEMPERATURE_EXCURSION`

---

### 4.9 StockCount

Physical inventory / cycle count.

| Field               | Type     | Required | Description                         |
|---------------------|----------|----------|-------------------------------------|
| `id`                | `string` | ✅       | Primary key                         |
| `organizationId`    | `string` | ✅       | FK → Organization                   |
| `facilityId`        | `string` | ✅       | FK → Pharmacy / Hospital            |
| `countNumber`       | `string` | ✅       | Auto-generated SC-YYYYMMDD-XXX     |
| `countType`         | `string` | ✅       | FULL · CYCLE · SPOT · ANNUAL        |
| `status`            | `string` | ✅       | PLANNED · IN_PROGRESS · PENDING_REVIEW · COMPLETED · CANCELLED |
| `scheduledDate`     | `string` | ✅       | Scheduled date                      |
| `startedAt`         | `string` | ❌       | Started timestamp                   |
| `completedAt`       | `string` | ❌       | Completed timestamp                 |
| `zone`              | `string` | ❌       | Restrict to zone / aisle            |
| `category`          | `string` | ❌       | Restrict to product category        |
| `totalItems`        | `number` | ✅       | Total items to count                |
| `itemsCounted`      | `number` | ✅       | Items counted so far                |
| `discrepancyCount`  | `number` | ✅       | Number of discrepancies             |
| `totalVarianceValue`| `number` | ✅       | Cost of discrepancies               |
| `assignedTo`        | `string[]`| ✅      | FK[] → User                         |
| `supervisedBy`      | `string` | ❌       | FK → User                           |
| `approvedBy`        | `string` | ❌       | FK → User                           |
| `notes`             | `string` | ❌       | Notes                               |
| `createdAt`         | `string` | ✅       | ISO creation timestamp              |
| `updatedAt`         | `string` | ❌       | ISO update timestamp                |

### Utility: `InventoryUtils`

| Method                              | Returns          | Description                              |
|-------------------------------------|------------------|------------------------------------------|
| `getAvailable(item)`               | `number`         | onHand – reserved (min 0)                |
| `calculateStatus(item, product)`   | `InventoryStatus`| Derive status from thresholds            |
| `daysRemaining(item)`              | `number`         | onHand / dailyUsage                      |
| `hasExpiringBatches(batches, days)`| `boolean`        | Any batch expiring within N days         |
| `getExpiredBatches(batches)`       | `Batch[]`        | Filter expired available batches         |
| `sortBatchesFEFO(batches)`        | `Batch[]`        | Sort First Expired, First Out            |
| `calculateStockValue(item)`       | `number`         | onHand × averageCost                     |
| `calculateMargin(cost, sell)`     | `number`         | Profit margin %                          |
| `needsReorder(item, product)`     | `boolean`        | Available ≤ reorderLevel                 |
| `generatePONumber()`             | `string`         | PO-YYYYMMDD-XXX                          |
| `generateCountNumber()`          | `string`         | SC-YYYYMMDD-XXX                          |
| `getAlertSeverity(item, product)` | `Severity`       | LOW / MEDIUM / HIGH / CRITICAL           |

---

## 5. Sale (POS)

**File:** `src/models/Sale.ts`

Complete point-of-sale model with cart management, split-payment, and receipt generation.

### Flow

```
CartState ─→ Checkout ─→ SalePayment[] ─→ processSale() ─→ Sale created
                                                          ─→ Stock deducted
                                                          ─→ StockMovements logged
                                                          ─→ Receipt generated
```

---

### 5.1 Sale

Completed transaction record.

| Field            | Type                | Required | Description                      |
|------------------|---------------------|----------|----------------------------------|
| `id`             | `string`            | ✅       | Primary key                      |
| `organizationId` | `string`            | ✅       | FK → Organization                |
| `facilityId`     | `string`            | ✅       | FK → Pharmacy / location         |
| `saleNumber`     | `string`            | ✅       | VNT-YYYYMMDD-XXXX               |
| `receiptNumber`  | `string`            | ✅       | REC-YYYYMMDD-XXXX               |
| `type`           | `SaleType`          | ✅       | Sale type                        |
| `customerId`     | `string`            | ❌       | FK → Patient                     |
| `customerName`   | `string`            | ❌       | Walk-in customer name            |
| `customerPhone`  | `string`            | ❌       | Customer phone                   |
| `prescriptionId` | `string`            | ❌       | FK → Prescription                |
| `items`          | `SaleItem[]`        | ✅       | Line items                       |
| `itemCount`      | `number`            | ✅       | Total line items                 |
| `totalQuantity`  | `number`            | ✅       | Total units sold                 |
| `subtotal`       | `number`            | ✅       | Before tax/discount              |
| `discountType`   | `DiscountType`      | ✅       | PERCENTAGE · FIXED · NONE       |
| `discountValue`  | `number`            | ✅       | Discount rate or amount          |
| `discountAmount` | `number`            | ✅       | Actual discount in currency      |
| `taxAmount`      | `number`            | ✅       | Total tax                        |
| `totalAmount`    | `number`            | ✅       | Final amount                     |
| `currency`       | `string`            | ✅       | CDF / USD                        |
| `payments`       | `SalePayment[]`     | ✅       | Payment records                  |
| `totalPaid`      | `number`            | ✅       | Sum of payments                  |
| `changeGiven`    | `number`            | ✅       | Change returned to customer      |
| `paymentStatus`  | `SalePaymentStatus` | ✅       | PAID · PARTIAL · UNPAID · REFUNDED |
| `status`         | `SaleStatus`        | ✅       | COMPLETED · VOIDED · REFUNDED · PARTIAL_REFUND · ON_HOLD |
| `voidReason`     | `string`            | ❌       | Reason for void                  |
| `voidedBy`       | `string`            | ❌       | FK → User                        |
| `voidedAt`       | `string`            | ❌       | Void timestamp                   |
| `cashierId`      | `string`            | ✅       | FK → User (cashier)              |
| `cashierName`    | `string`            | ✅       | Cashier display name             |
| `notes`          | `string`            | ❌       | Sale notes                       |
| `createdAt`      | `string`            | ✅       | ISO creation timestamp           |
| `updatedAt`      | `string`            | ❌       | ISO update timestamp             |

**SaleType:** `COUNTER` · `PRESCRIPTION` · `INSURANCE` · `WHOLESALE` · `RETURN`

**SaleStatus:** `COMPLETED` · `VOIDED` · `REFUNDED` · `PARTIAL_REFUND` · `ON_HOLD`

---

### 5.2 SaleItem

Line item within a completed sale.

| Field                | Type      | Required | Description                       |
|----------------------|-----------|----------|-----------------------------------|
| `id`                 | `string`  | ✅       | Primary key                       |
| `saleId`             | `string`  | ✅       | FK → Sale                         |
| `productId`          | `string`  | ✅       | FK → Product                      |
| `batchId`            | `string`  | ❌       | FK → InventoryBatch (FEFO)        |
| `inventoryItemId`    | `string`  | ❌       | FK → InventoryItem                |
| `productName`        | `string`  | ✅       | Snapshot at sale time              |
| `productSku`         | `string`  | ✅       | SKU snapshot                       |
| `genericName`        | `string`  | ❌       | Generic name snapshot              |
| `dosageForm`         | `string`  | ❌       | Dosage form snapshot               |
| `strength`           | `string`  | ❌       | Strength snapshot                  |
| `requiresPrescription`| `boolean`| ✅       | Rx flag snapshot                   |
| `quantity`           | `number`  | ✅       | Quantity sold                      |
| `returnedQuantity`   | `number`  | ✅       | Quantity returned (for refunds)    |
| `unitPrice`          | `number`  | ✅       | Selling price per unit             |
| `costPrice`          | `number`  | ✅       | Cost at time of sale               |
| `discountPercent`    | `number`  | ✅       | Per-line discount %                |
| `discountAmount`     | `number`  | ✅       | Computed discount                  |
| `taxRate`            | `number`  | ✅       | Tax %                              |
| `taxAmount`          | `number`  | ✅       | Computed tax                       |
| `lineTotal`          | `number`  | ✅       | Final line total                   |
| `notes`              | `string`  | ❌       | Line notes                         |

---

### 5.3 SalePayment

Supports split payment across multiple methods.

| Field        | Type            | Required | Description                       |
|--------------|-----------------|----------|-----------------------------------|
| `id`         | `string`        | ✅       | Primary key                       |
| `saleId`     | `string`        | ✅       | FK → Sale                         |
| `method`     | `PaymentMethod` | ✅       | Payment method                    |
| `amount`     | `number`        | ✅       | Amount for this method            |
| `reference`  | `string`        | ❌       | Txn ID / Cheque # / Reference     |
| `receivedAt` | `string`        | ✅       | Payment timestamp                 |

**PaymentMethod:** `CASH` · `MOBILE_MONEY` · `CARD` · `BANK_TRANSFER` · `CHEQUE` · `INSURANCE` · `CREDIT` · `OTHER`

---

### 5.4 CartItem & CartState

In-memory shopping cart (not persisted to database).

#### CartItem

| Field            | Type     | Required | Description                        |
|------------------|----------|----------|------------------------------------|
| `productId`      | `string` | ✅       | FK → Product                       |
| `product`        | `object` | ✅       | Product snapshot (name, sku, price, tax, category, etc.) |
| `quantity`       | `number` | ✅       | Quantity in cart                    |
| `unitPrice`      | `number` | ✅       | May differ from product price      |
| `discountPercent`| `number` | ✅       | Per-line discount %                |
| `discountAmount` | `number` | ✅       | Computed discount                  |
| `taxAmount`      | `number` | ✅       | Computed tax                       |
| `lineTotal`      | `number` | ✅       | Computed line total                |
| `inventoryItemId`| `string` | ❌       | FK → InventoryItem                 |
| `batchId`        | `string` | ❌       | FK → InventoryBatch                |
| `maxQuantity`    | `number` | ✅       | Available stock (ceiling)          |
| `notes`          | `string` | ❌       | Line notes                         |

#### CartState

| Field               | Type         | Required | Description                     |
|---------------------|--------------|----------|---------------------------------|
| `items`             | `CartItem[]` | ✅       | Items in cart                   |
| `customerId`        | `string`     | ❌       | FK → Patient                    |
| `customerName`      | `string`     | ❌       | Customer name                   |
| `customerPhone`     | `string`     | ❌       | Customer phone                  |
| `prescriptionId`    | `string`     | ❌       | FK → Prescription               |
| `saleType`          | `SaleType`   | ✅       | Defaults to COUNTER             |
| `globalDiscountType`| `string`     | ✅       | PERCENTAGE · FIXED · NONE      |
| `globalDiscountValue`| `number`    | ✅       | Discount rate or amount         |

---

### 5.5 CartTotals

Computed totals for the active cart.

| Field            | Type     | Description                               |
|------------------|----------|-------------------------------------------|
| `itemCount`      | `number` | Number of distinct line items             |
| `totalQuantity`  | `number` | Sum of all quantities                     |
| `subtotal`       | `number` | Sum of (qty × unitPrice)                  |
| `lineDiscounts`  | `number` | Sum of per-line discounts                 |
| `globalDiscount` | `number` | Global discount amount                    |
| `totalDiscount`  | `number` | lineDiscounts + globalDiscount            |
| `taxTotal`       | `number` | Sum of all tax                            |
| `grandTotal`     | `number` | subtotal − totalDiscount + taxTotal       |

### Utility: `SaleUtils`

| Method                          | Returns      | Description                                |
|---------------------------------|--------------|--------------------------------------------|
| `computeLineItem(item)`        | `CartItem`   | Compute discount, tax, lineTotal           |
| `computeCartTotals(cart)`       | `CartTotals` | Full cart math                             |
| `generateSaleNumber()`         | `string`     | VNT-YYYYMMDD-XXXX                         |
| `generateReceiptNumber()`      | `string`     | REC-YYYYMMDD-XXXX                         |
| `createEmptyCart()`             | `CartState`  | Empty cart with COUNTER type               |
| `formatCurrency(amount, cur)`  | `string`     | "$12.50" or "12 500 FC"                    |
| `formatDateTime(iso)`          | `string`     | French locale date/time                    |
| `formatTime(iso)`              | `string`     | French locale time only                    |
| `getPaymentMethodLabel(method)`| `string`     | French label (Espèces, Mobile Money, etc.) |
| `getPaymentMethodIcon(method)` | `string`     | Ionicons name for payment method           |

---

## DatabaseService POS Methods

Located in `src/services/DatabaseService.ts`:

| Method                                    | Returns   | Description                                              |
|-------------------------------------------|-----------|----------------------------------------------------------|
| `processSale(cart, payments, ...)`         | `Sale`    | Full checkout: create Sale, deduct stock (FEFO), log movements |
| `getSale(id)`                             | `Sale?`   | Retrieve sale by ID                                      |
| `getSalesByOrganization(orgId, options?)`  | `Sale[]`  | Filter by status, dates, limit                           |
| `voidSale(saleId, userId, reason)`         | `Sale?`   | Void sale, restore stock + batches, log reversal movements |
| `getTodaysSalesSummary(orgId)`             | `Summary` | KPIs: totalSales, totalRevenue, totalProfit, avgSaleValue, paymentBreakdown |

---

*Last updated: February 11, 2026*
