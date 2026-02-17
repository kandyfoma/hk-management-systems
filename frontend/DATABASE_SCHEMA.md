# HK Management Systems — Database Schema & Relations

> Auto-generated from TypeScript models · Updated 2026-02-11

---

## Entity-Relationship Diagram (Text)

```
┌─────────────────┐
│  Organization    │ ◄──── Root tenant. Every entity belongs to one org.
└──────┬──────────┘
       │ 1
       ├───── N ─── License ──────────── N ─── UserModuleAccess
       │                                            │
       ├───── N ─── User ◄──────────────────────────┘
       │
       ├───── N ─── Hospital          (facility)
       │
       ├───── N ─── Pharmacy          (facility)
       │
       ├───── N ─── Supplier ─────── 1:N ─── PurchaseOrder
       │                                        │ 1
       │                                        └─── N ─── PurchaseOrderItem
       │
       ├───── N ─── Product ──┬── 1:N ─── InventoryItem ──┬── 1:N ─── InventoryBatch
       │                      │                            │
       │                      └────────────────────────────├── 1:N ─── StockMovement
       │                                                   │
       │                                                   └── 1:N ─── InventoryAlert
       │
       ├───── N ─── Patient ──── 1:N ─── MedicalRecord
       │
       └───── N ─── StockCount ─── 1:N ─── StockCountItem
```

---

## 1. Organization

The root tenant entity. Every piece of data is scoped to a single organisation.

| Column             | Type                | Required | Description                         |
|--------------------|---------------------|----------|-------------------------------------|
| id                 | `string` (PK)       | ✅       | UUID primary key                    |
| name               | `string`            | ✅       | Organisation name                   |
| registrationNumber | `string`            |          | Government registration number      |
| businessType       | `BusinessType`      | ✅       | HOSPITAL / PHARMACY / CLINIC / …    |
| address            | `string`            |          | Street address                      |
| city               | `string`            |          | City                                |
| country            | `string`            |          | Country (e.g. "RD Congo")          |
| phone              | `string`            |          | Main phone number                   |
| email              | `string`            |          | Contact email                       |
| contactPerson      | `string`            |          | Primary contact name                |
| billingAddress     | `string`            |          | Billing-specific address            |
| taxNumber          | `string`            |          | Tax identification number           |
| isActive           | `boolean`           | ✅       | Soft-delete flag (default `true`)   |
| settings           | `JSON`              |          | Org-level settings blob             |
| createdAt          | `ISO 8601`          | ✅       | Creation timestamp                  |
| updatedAt          | `ISO 8601`          |          | Last update                         |

**BusinessType**: `HOSPITAL` | `PHARMACY` | `CLINIC` | `HEALTHCARE_GROUP` | `MEDICAL_CENTER` | `DIAGNOSTIC_CENTER`

---

## 2. License

Modular licensing — one org can hold multiple license modules simultaneously.

| Column        | Type           | Required | FK              | Description                       |
|---------------|----------------|----------|-----------------|-----------------------------------|
| id            | `string` (PK)  | ✅       |                 | UUID                              |
| licenseKey    | `string` (UQ)  | ✅       |                 | Activation key                    |
| organizationId| `string`       | ✅       | → Organization  | Owner organisation                |
| moduleType    | `ModuleType`   | ✅       |                 | PHARMACY / HOSPITAL / COMBINED / TRIAL |
| licenseTier   | `LicenseTier`  | ✅       |                 | BASIC / PROFESSIONAL / ENTERPRISE / TRIAL |
| isActive      | `boolean`      | ✅       |                 | Active flag                       |
| issuedDate    | `ISO 8601`     | ✅       |                 | Issue date                        |
| expiryDate    | `ISO 8601`     |          |                 | Null = perpetual                  |
| maxUsers      | `number`       |          |                 | Null = unlimited                  |
| maxFacilities | `number`       |          |                 | Null = unlimited                  |
| features      | `string[]`     | ✅       |                 | Feature flag list                 |
| billingCycle  | `BillingCycle` | ✅       |                 | MONTHLY / ANNUAL / PERPETUAL / TRIAL |
| autoRenew     | `boolean`      | ✅       |                 | Auto-renewal flag                 |
| createdAt     | `ISO 8601`     | ✅       |                 |                                   |
| updatedAt     | `ISO 8601`     |          |                 |                                   |
| metadata      | `JSON`         |          |                 |                                   |

**Relation**: `Organization 1 ──▶ N License`

---

## 3. User

Phone-based authentication (no username/email login).

| Column              | Type           | Required | FK             | Description                      |
|---------------------|----------------|----------|----------------|----------------------------------|
| id                  | `string` (PK)  | ✅       |                | UUID                             |
| organizationId      | `string`       | ✅       | → Organization | Owner org                        |
| phone               | `string`       | ✅       |                | Login identifier                 |
| firstName           | `string`       | ✅       |                |                                  |
| lastName            | `string`       | ✅       |                |                                  |
| primaryRole         | `UserRole`     | ✅       |                | admin / pharmacist / doctor / …  |
| department          | `string`       |          |                |                                  |
| employeeId          | `string`       |          |                |                                  |
| professionalLicense | `string`       |          |                | Medical / pharmacy license #     |
| isActive            | `boolean`      | ✅       |                | Soft-delete flag                 |
| lastLogin           | `ISO 8601`     |          |                |                                  |
| createdAt           | `ISO 8601`     | ✅       |                |                                  |
| updatedAt           | `ISO 8601`     |          |                |                                  |
| metadata            | `JSON`         |          |                |                                  |

**UserRole**: `admin` | `hospital_admin` | `pharmacy_admin` | `doctor` | `nurse` | `pharmacist` | `pharmacy_tech` | `receptionist` | `lab_technician` | `cashier` | `inventory_manager`

**Relation**: `Organization 1 ──▶ N User`

---

## 4. UserModuleAccess

Bridge table granting a user access to a specific license module.

| Column        | Type          | Required | FK         | Description                         |
|---------------|---------------|----------|------------|-------------------------------------|
| id            | `string` (PK) | ✅       |            | UUID                                |
| userId        | `string`      | ✅       | → User     | The user being granted access       |
| licenseId     | `string`      | ✅       | → License  | Which license module                |
| moduleType    | `ModuleType`  | ✅       |            | Denormalised for quick checks       |
| role          | `string`      | ✅       |            | Role within this module             |
| permissions   | `string[]`    | ✅       |            | Granular permission flags           |
| facilityAccess| `string[]`    | ✅       |            | Facility IDs user can access        |
| isActive      | `boolean`     | ✅       |            |                                     |
| grantedAt     | `ISO 8601`    | ✅       |            |                                     |
| createdAt     | `ISO 8601`    | ✅       |            |                                     |
| updatedAt     | `ISO 8601`    |          |            |                                     |

**Relations**: `User N ◄──▶ N License` (via this bridge)

---

## 5. Hospital (Facility)

| Column           | Type             | Required | FK             |
|------------------|------------------|----------|----------------|
| id               | `string` (PK)    | ✅       |                |
| organizationId   | `string`         | ✅       | → Organization |
| name             | `string`         | ✅       |                |
| hospitalCode     | `string` (UQ)    | ✅       |                |
| type             | `HospitalType`   | ✅       |                |
| bedCapacity      | `number`         | ✅       |                |
| departments      | `string[]`       | ✅       |                |
| servicesOffered  | `string[]`       | ✅       |                |
| accreditationInfo| `JSON`           |          |                |
| emergencyContact | `string`         |          |                |
| isActive         | `boolean`        | ✅       |                |
| createdAt        | `ISO 8601`       | ✅       |                |
| updatedAt        | `ISO 8601`       |          |                |

**HospitalType**: `GENERAL` | `SPECIALTY` | `CLINIC` | `EMERGENCY` | `TEACHING` | `PSYCHIATRIC` | `REHABILITATION`

---

## 6. Pharmacy (Facility)

| Column           | Type           | Required | FK             |
|------------------|----------------|----------|----------------|
| id               | `string` (PK)  | ✅       |                |
| organizationId   | `string`       | ✅       | → Organization |
| name             | `string`       | ✅       |                |
| pharmacyCode     | `string` (UQ)  | ✅       |                |
| licenseNumber    | `string`       | ✅       |                |
| type             | `PharmacyType` | ✅       |                |
| services         | `string[]`     | ✅       |                |
| operatingHours   | `JSON`         |          |                |
| acceptsInsurance | `boolean`      | ✅       |                |
| deliveryAvailable| `boolean`      | ✅       |                |
| is24Hours        | `boolean`      | ✅       |                |
| isActive         | `boolean`      | ✅       |                |
| createdAt        | `ISO 8601`     | ✅       |                |
| updatedAt        | `ISO 8601`     |          |                |

**PharmacyType**: `RETAIL` | `HOSPITAL` | `SPECIALTY` | `ONLINE` | `COMPOUND` | `CLINICAL`

---

## 7. Supplier

| Column           | Type            | Required | FK             | Description                     |
|------------------|-----------------|----------|----------------|---------------------------------|
| id               | `string` (PK)   | ✅       |                | UUID                            |
| organizationId   | `string`        | ✅       | → Organization | Owner org                       |
| name             | `string`        | ✅       |                | Company name                    |
| code             | `string` (UQ)   | ✅       |                | Internal supplier code          |
| contactPerson    | `string`        | ✅       |                |                                 |
| phone            | `string`        | ✅       |                |                                 |
| altPhone         | `string`        |          |                |                                 |
| email            | `string`        |          |                |                                 |
| website          | `string`        |          |                |                                 |
| address          | `string`        | ✅       |                |                                 |
| city             | `string`        | ✅       |                |                                 |
| country          | `string`        | ✅       |                |                                 |
| taxId            | `string`        |          |                | Tax identification              |
| licenseNumber    | `string`        |          |                | Pharma distribution license     |
| paymentTerms     | `PaymentTerms`  | ✅       |                | COD / NET_30 / PREPAID / …      |
| creditLimit      | `number`        |          |                |                                 |
| currentBalance   | `number`        | ✅       |                | Outstanding balance              |
| currency         | `string`        | ✅       |                | CDF / USD / EUR                 |
| bankName         | `string`        |          |                |                                 |
| bankAccountNumber| `string`        |          |                |                                 |
| rating           | `number`        | ✅       |                | 1-5 quality rating              |
| leadTimeDays     | `number`        | ✅       |                | Avg delivery days               |
| isActive         | `boolean`       | ✅       |                |                                 |
| notes            | `string`        |          |                |                                 |
| createdAt        | `ISO 8601`      | ✅       |                |                                 |
| updatedAt        | `ISO 8601`      |          |                |                                 |

**PaymentTerms**: `CASH_ON_DELIVERY` | `NET_7` | `NET_15` | `NET_30` | `NET_60` | `NET_90` | `PREPAID` | `CREDIT`

**Relation**: `Organization 1 ──▶ N Supplier`

---

## 8. Product

Comprehensive pharmaceutical product catalogue (replaces the simpler `Drug` model for inventory).

| Column              | Type                | Required | FK              | Description                       |
|---------------------|---------------------|----------|-----------------|-----------------------------------|
| id                  | `string` (PK)       | ✅       |                 | UUID                              |
| organizationId      | `string`            | ✅       | → Organization  | Owner org                         |
| name                | `string`            | ✅       |                 | Commercial name                   |
| genericName         | `string`            |          |                 | INN name                          |
| brandName           | `string`            |          |                 |                                   |
| sku                 | `string` (UQ/org)   | ✅       |                 | Stock Keeping Unit                |
| barcode             | `string`            |          |                 | EAN-13 / UPC                      |
| internalCode        | `string`            |          |                 |                                   |
| category            | `ProductCategory`   | ✅       |                 | MEDICATION / OTC / CONSUMABLE / … |
| subCategory         | `string`            |          |                 |                                   |
| therapeuticClass    | `string`            |          |                 | ATC classification                |
| controlledSubstance | `boolean`           | ✅       |                 |                                   |
| requiresPrescription| `boolean`           | ✅       |                 |                                   |
| scheduledDrug       | `ScheduledDrugClass`|          |                 |                                   |
| dosageForm          | `DosageForm`        | ✅       |                 | TABLET / CAPSULE / SYRUP / …      |
| strength            | `string`            |          |                 | e.g. "500mg"                      |
| unitOfMeasure       | `UnitOfMeasure`     | ✅       |                 | Smallest dispensing unit           |
| packSize            | `number`            | ✅       |                 | Units per pack                    |
| packType            | `string`            |          |                 | blister / bottle / box            |
| activeIngredients   | `string[]`          | ✅       |                 |                                   |
| concentration       | `string`            |          |                 |                                   |
| manufacturer        | `string`            | ✅       |                 |                                   |
| countryOfOrigin     | `string`            |          |                 |                                   |
| registrationNumber  | `string`            |          |                 | Drug marketing auth #             |
| indication          | `string`            |          |                 |                                   |
| contraindication    | `string`            |          |                 |                                   |
| sideEffects         | `string`            |          |                 |                                   |
| dosageInstructions  | `string`            |          |                 |                                   |
| storageConditions   | `StorageCondition`  |          |                 | ROOM_TEMP / REFRIGERATED / …      |
| warnings            | `string`            |          |                 |                                   |
| costPrice           | `number`            | ✅       |                 | Purchase cost per unit            |
| sellingPrice        | `number`            | ✅       |                 | Retail price per unit             |
| wholesalePrice      | `number`            |          |                 |                                   |
| currency            | `string`            | ✅       |                 |                                   |
| taxRate             | `number`            | ✅       |                 | Tax % (e.g. 16)                   |
| marginPercent       | `number`            |          |                 | Auto-calculated                   |
| insuranceReimbursable| `boolean`          | ✅       |                 |                                   |
| insuranceCode       | `string`            |          |                 | NHIS billing code                 |
| reorderLevel        | `number`            | ✅       |                 | Alert trigger                     |
| reorderQuantity     | `number`            | ✅       |                 | Default re-order qty              |
| minStockLevel       | `number`            | ✅       |                 | Absolute minimum                  |
| maxStockLevel       | `number`            | ✅       |                 | Maximum recommended               |
| safetyStockDays     | `number`            | ✅       |                 | Buffer in days                    |
| isActive            | `boolean`           | ✅       |                 |                                   |
| isDiscontinued      | `boolean`           | ✅       |                 |                                   |
| discontinuedDate    | `string`            |          |                 |                                   |
| primarySupplierId   | `string`            |          | → Supplier      | Preferred supplier                |
| alternateSupplierIds| `string[]`          |          | → Supplier[]    | Alternate suppliers               |
| imageUrl            | `string`            |          |                 |                                   |
| thumbnailUrl        | `string`            |          |                 |                                   |
| tags                | `string[]`          |          |                 |                                   |
| notes               | `string`            |          |                 |                                   |
| createdAt           | `ISO 8601`          | ✅       |                 |                                   |
| updatedAt           | `ISO 8601`          |          |                 |                                   |
| metadata            | `JSON`              |          |                 |                                   |

**Key Types**:
- **ProductCategory**: `MEDICATION` | `OTC` | `SUPPLEMENT` | `MEDICAL_DEVICE` | `SURGICAL_SUPPLY` | `CONSUMABLE` | `COSMETIC` | `BABY_CARE` | `PERSONAL_HYGIENE` | `LAB_REAGENT` | `VETERINARY` | `OTHER`
- **DosageForm**: `TABLET` | `CAPSULE` | `SYRUP` | `SUSPENSION` | `INJECTION` | `CREAM` | `OINTMENT` | `GEL` | `DROPS` | `INHALER` | `SUPPOSITORY` | `PATCH` | `POWDER` | `SOLUTION` | `SPRAY` | `LOZENGE` | `INFUSION` | `IMPLANT` | `DEVICE` | `OTHER`
- **UnitOfMeasure**: `UNIT` | `TABLET` | `CAPSULE` | `ML` | `MG` | `G` | `VIAL` | `AMPOULE` | `BOTTLE` | `BOX` | `PACK` | `STRIP` | `TUBE` | `SACHET` | `PAIR` | `SET`
- **StorageCondition**: `ROOM_TEMPERATURE` | `COOL_DRY_PLACE` | `REFRIGERATED` | `FROZEN` | `DEEP_FROZEN` | `PROTECT_FROM_LIGHT` | `PROTECT_FROM_MOISTURE`

**Relations**:
- `Organization 1 ──▶ N Product`
- `Supplier 1 ──▶ N Product` (via `primarySupplierId`)

---

## 9. InventoryItem

Stock of a product at a specific facility / location. One product can have inventory at multiple facilities.

| Column              | Type             | Required | FK            | Description                       |
|---------------------|------------------|----------|---------------|-----------------------------------|
| id                  | `string` (PK)    | ✅       |               | UUID                              |
| organizationId      | `string`         | ✅       | → Organization|                                   |
| productId           | `string`         | ✅       | → Product     |                                   |
| facilityId          | `string`         | ✅       | → Pharmacy/Hospital |                              |
| facilityType        | `enum`           | ✅       |               | PHARMACY / HOSPITAL_WARD / WAREHOUSE |
| quantityOnHand      | `number`         | ✅       |               | Physical stock now                |
| quantityReserved    | `number`         | ✅       |               | Reserved for pending orders       |
| quantityAvailable   | `number`         | ✅       |               | onHand − reserved (calculated)    |
| quantityOnOrder     | `number`         | ✅       |               | In open POs                       |
| quantityDamaged     | `number`         | ✅       |               |                                   |
| quantityExpired     | `number`         | ✅       |               |                                   |
| shelfLocation       | `string`         |          |               | e.g. "A3-R2-S4"                   |
| binNumber           | `string`         |          |               |                                   |
| zone                | `string`         |          |               | Controlled / Refrigerated / General |
| averageCost         | `number`         | ✅       |               | Weighted average cost             |
| totalStockValue     | `number`         | ✅       |               | onHand × averageCost              |
| lastPurchasePrice   | `number`         | ✅       |               |                                   |
| lastPurchaseDate    | `ISO 8601`       |          |               |                                   |
| averageDailyUsage   | `number`         | ✅       |               | Rolling average                   |
| daysOfStockRemaining| `number`         | ✅       |               | onHand / dailyUsage               |
| lastMovementDate    | `ISO 8601`       |          |               |                                   |
| lastCountDate       | `ISO 8601`       |          |               |                                   |
| status              | `InventoryStatus`| ✅       |               |                                   |
| isActive            | `boolean`        | ✅       |               |                                   |
| createdAt           | `ISO 8601`       | ✅       |               |                                   |
| updatedAt           | `ISO 8601`       |          |               |                                   |

**InventoryStatus**: `IN_STOCK` | `LOW_STOCK` | `OUT_OF_STOCK` | `OVER_STOCK` | `DISCONTINUED` | `QUARANTINED`

**Relations**:
- `Product 1 ──▶ N InventoryItem`
- `InventoryItem 1 ──▶ N InventoryBatch`
- `InventoryItem 1 ──▶ N StockMovement`

---

## 10. InventoryBatch

Lot / expiry tracking per product per location. Enables FEFO (First Expired, First Out).

| Column           | Type           | Required | FK               | Description                     |
|------------------|----------------|----------|------------------|---------------------------------|
| id               | `string` (PK)  | ✅       |                  | UUID                            |
| inventoryItemId  | `string`       | ✅       | → InventoryItem  |                                 |
| productId        | `string`       | ✅       | → Product        | Denormalised for speed          |
| batchNumber      | `string`       | ✅       |                  | Manufacturer lot number         |
| serialNumber     | `string`       |          |                  | For serialised products         |
| quantity         | `number`       | ✅       |                  | Current qty in batch            |
| initialQuantity  | `number`       | ✅       |                  | Qty received originally         |
| costPrice        | `number`       | ✅       |                  | Purchase cost per unit          |
| manufacturingDate| `ISO 8601`     |          |                  |                                 |
| expiryDate       | `ISO 8601`     | ✅       |                  | Critical for pharmacy           |
| receivedDate     | `ISO 8601`     | ✅       |                  |                                 |
| lastDispensedDate| `ISO 8601`     |          |                  |                                 |
| status           | `BatchStatus`  | ✅       |                  |                                 |
| isQuarantined    | `boolean`      | ✅       |                  |                                 |
| quarantineReason | `string`       |          |                  |                                 |
| disposalDate     | `ISO 8601`     |          |                  |                                 |
| disposalMethod   | `string`       |          |                  |                                 |
| disposalApprovedBy| `string`      |          | → User           |                                 |
| supplierId       | `string`       |          | → Supplier       |                                 |
| purchaseOrderId  | `string`       |          | → PurchaseOrder  |                                 |
| invoiceNumber    | `string`       |          |                  |                                 |
| notes            | `string`       |          |                  |                                 |
| createdAt        | `ISO 8601`     | ✅       |                  |                                 |
| updatedAt        | `ISO 8601`     |          |                  |                                 |

**BatchStatus**: `AVAILABLE` | `RESERVED` | `EXPIRED` | `QUARANTINED` | `RECALLED` | `DAMAGED` | `DISPOSED` | `RETURNED`

---

## 11. StockMovement

Immutable audit log — every stock in/out creates an entry. Never deleted.

| Column               | Type                    | Required | FK               |
|----------------------|-------------------------|----------|------------------|
| id                   | `string` (PK)           | ✅       |                  |
| organizationId       | `string`                | ✅       | → Organization   |
| inventoryItemId      | `string`                | ✅       | → InventoryItem  |
| productId            | `string`                | ✅       | → Product        |
| batchId              | `string`                |          | → InventoryBatch |
| movementType         | `MovementType`          | ✅       |                  |
| direction            | `'IN' \| 'OUT'`         | ✅       |                  |
| quantity             | `number`                | ✅       | Always positive  |
| unitCost             | `number`                | ✅       |                  |
| totalCost            | `number`                | ✅       | qty × unitCost   |
| previousBalance      | `number`                | ✅       |                  |
| newBalance           | `number`                | ✅       |                  |
| sourceFacilityId     | `string`                |          | For transfers    |
| destinationFacilityId| `string`                |          | For transfers    |
| referenceType        | `MovementReferenceType` |          |                  |
| referenceId          | `string`                |          | FK to related doc|
| referenceNumber      | `string`                |          | Human-readable   |
| performedBy          | `string`                | ✅       | → User           |
| approvedBy           | `string`                |          | → User           |
| movementDate         | `ISO 8601`              | ✅       |                  |
| reason               | `string`                |          |                  |
| notes                | `string`                |          |                  |
| createdAt            | `ISO 8601`              | ✅       |                  |

**MovementType** (17 types): `PURCHASE_RECEIPT` | `SALE` | `PRESCRIPTION` | `TRANSFER_IN` | `TRANSFER_OUT` | `RETURN_TO_SUPPLIER` | `CUSTOMER_RETURN` | `ADJUSTMENT_IN` | `ADJUSTMENT_OUT` | `DAMAGED` | `EXPIRED` | `DISPOSAL` | `DONATION` | `INITIAL_STOCK` | `PRODUCTION` | `SAMPLE` | `RECALL`

---

## 12. PurchaseOrder

Full PO lifecycle: DRAFT → APPROVED → ORDERED → RECEIVED.

| Column              | Type                  | Required | FK             |
|---------------------|-----------------------|----------|----------------|
| id                  | `string` (PK)         | ✅       |                |
| organizationId      | `string`              | ✅       | → Organization |
| supplierId          | `string`              | ✅       | → Supplier     |
| facilityId          | `string`              | ✅       | → Facility     |
| poNumber            | `string` (UQ)         | ✅       | Auto-generated |
| status              | `PurchaseOrderStatus` | ✅       |                |
| priority            | `enum`                | ✅       | LOW/NORMAL/HIGH/URGENT |
| orderDate           | `ISO 8601`            | ✅       |                |
| expectedDeliveryDate| `ISO 8601`            |          |                |
| actualDeliveryDate  | `ISO 8601`            |          |                |
| subtotal            | `number`              | ✅       |                |
| taxAmount           | `number`              | ✅       |                |
| discountAmount      | `number`              | ✅       |                |
| shippingCost        | `number`              | ✅       |                |
| totalAmount         | `number`              | ✅       |                |
| currency            | `string`              | ✅       |                |
| paymentStatus       | `PaymentStatus`       | ✅       |                |
| paymentMethod       | `string`              |          |                |
| paymentDate         | `ISO 8601`            |          |                |
| paymentReference    | `string`              |          |                |
| createdBy           | `string`              | ✅       | → User         |
| approvedBy          | `string`              |          | → User         |
| approvalDate        | `ISO 8601`            |          |                |
| receivedBy          | `string`              |          | → User         |
| receivedDate        | `ISO 8601`            |          |                |
| deliveryAddress     | `string`              |          |                |
| trackingNumber      | `string`              |          |                |
| shippingMethod      | `string`              |          |                |
| notes               | `string`              |          |                |
| internalNotes       | `string`              |          |                |
| attachments         | `string[]`            |          |                |
| createdAt           | `ISO 8601`            | ✅       |                |
| updatedAt           | `ISO 8601`            |          |                |

**PurchaseOrderStatus**: `DRAFT` | `PENDING_APPROVAL` | `APPROVED` | `ORDERED` | `PARTIALLY_RECEIVED` | `RECEIVED` | `CANCELLED` | `RETURNED`

---

## 13. PurchaseOrderItem

Line items within a PO.

| Column           | Type          | Required | FK              |
|------------------|---------------|----------|-----------------|
| id               | `string` (PK) | ✅       |                 |
| purchaseOrderId  | `string`      | ✅       | → PurchaseOrder |
| productId        | `string`      | ✅       | → Product       |
| quantityOrdered  | `number`      | ✅       |                 |
| quantityReceived | `number`      | ✅       |                 |
| quantityDamaged  | `number`      | ✅       |                 |
| quantityReturned | `number`      | ✅       |                 |
| unitPrice        | `number`      | ✅       |                 |
| discount         | `number`      | ✅       |                 |
| taxRate          | `number`      | ✅       |                 |
| taxAmount        | `number`      | ✅       |                 |
| lineTotal        | `number`      | ✅       |                 |
| batchNumber      | `string`      |          |                 |
| expiryDate       | `ISO 8601`    |          |                 |
| manufacturingDate| `ISO 8601`    |          |                 |
| status           | `enum`        | ✅       | PENDING/PARTIALLY_RECEIVED/RECEIVED/CANCELLED/BACK_ORDERED |
| notes            | `string`      |          |                 |
| createdAt        | `ISO 8601`    | ✅       |                 |
| updatedAt        | `ISO 8601`    |          |                 |

---

## 14. InventoryAlert

Automated & manual alerts for stock issues.

| Column           | Type          | Required | FK               |
|------------------|---------------|----------|------------------|
| id               | `string` (PK) | ✅       |                  |
| organizationId   | `string`      | ✅       | → Organization   |
| productId        | `string`      | ✅       | → Product        |
| inventoryItemId  | `string`      |          | → InventoryItem  |
| batchId          | `string`      |          | → InventoryBatch |
| alertType        | `AlertType`   | ✅       |                  |
| severity         | `enum`        | ✅       | LOW/MEDIUM/HIGH/CRITICAL |
| title            | `string`      | ✅       |                  |
| message          | `string`      | ✅       |                  |
| currentValue     | `number`      |          |                  |
| thresholdValue   | `number`      |          |                  |
| expiryDate       | `ISO 8601`    |          |                  |
| daysUntilExpiry  | `number`      |          |                  |
| status           | `enum`        | ✅       | ACTIVE/ACKNOWLEDGED/RESOLVED/DISMISSED/AUTO_RESOLVED |
| acknowledgedBy   | `string`      |          | → User           |
| acknowledgedAt   | `ISO 8601`    |          |                  |
| resolvedBy       | `string`      |          | → User           |
| resolvedAt       | `ISO 8601`    |          |                  |
| resolutionNotes  | `string`      |          |                  |
| createdAt        | `ISO 8601`    | ✅       |                  |
| updatedAt        | `ISO 8601`    |          |                  |

**AlertType**: `LOW_STOCK` | `OUT_OF_STOCK` | `OVER_STOCK` | `EXPIRING_SOON` | `EXPIRED` | `RECALL` | `REORDER_POINT` | `PRICE_CHANGE` | `SLOW_MOVING` | `DAMAGED_STOCK` | `TEMPERATURE_EXCURSION`

---

## 15. StockCount & StockCountItem

Physical inventory / cycle count with variance tracking.

### StockCount (Header)

| Column           | Type          | Required | FK             |
|------------------|---------------|----------|----------------|
| id               | `string` (PK) | ✅       |                |
| organizationId   | `string`      | ✅       | → Organization |
| facilityId       | `string`      | ✅       | → Facility     |
| countNumber      | `string` (UQ) | ✅       | Auto-generated |
| countType        | `enum`        | ✅       | FULL/CYCLE/SPOT/ANNUAL |
| status           | `enum`        | ✅       | PLANNED/IN_PROGRESS/PENDING_REVIEW/COMPLETED/CANCELLED |
| scheduledDate    | `ISO 8601`    | ✅       |                |
| startedAt        | `ISO 8601`    |          |                |
| completedAt      | `ISO 8601`    |          |                |
| zone             | `string`      |          |                |
| category         | `string`      |          |                |
| totalItems       | `number`      | ✅       |                |
| itemsCounted     | `number`      | ✅       |                |
| discrepancyCount | `number`      | ✅       |                |
| totalVarianceValue| `number`     | ✅       |                |
| assignedTo       | `string[]`    | ✅       | → User[]       |
| supervisedBy     | `string`      |          | → User         |
| approvedBy       | `string`      |          | → User         |
| notes            | `string`      |          |                |
| createdAt        | `ISO 8601`    | ✅       |                |
| updatedAt        | `ISO 8601`    |          |                |

### StockCountItem (Line items)

| Column              | Type          | Required | FK               |
|---------------------|---------------|----------|------------------|
| id                  | `string` (PK) | ✅       |                  |
| stockCountId        | `string`      | ✅       | → StockCount     |
| productId           | `string`      | ✅       | → Product        |
| inventoryItemId     | `string`      | ✅       | → InventoryItem  |
| batchId             | `string`      |          | → InventoryBatch |
| systemQuantity      | `number`      | ✅       |                  |
| countedQuantity     | `number`      | ✅       |                  |
| variance            | `number`      | ✅       | counted − system |
| varianceValue       | `number`      | ✅       | variance × cost  |
| variancePercent     | `number`      | ✅       | (variance/system) × 100 |
| adjustmentApplied   | `boolean`     | ✅       |                  |
| adjustmentMovementId| `string`      |          | → StockMovement  |
| reason              | `string`      |          |                  |
| countedBy           | `string`      | ✅       | → User           |
| countedAt           | `ISO 8601`    | ✅       |                  |
| notes               | `string`      |          |                  |
| createdAt           | `ISO 8601`    | ✅       |                  |
| updatedAt           | `ISO 8601`    |          |                  |

---

## 16. Patient

| Column                  | Type          | Required | FK             |
|-------------------------|---------------|----------|----------------|
| id                      | `string` (PK) | ✅       |                |
| firstName               | `string`      | ✅       |                |
| lastName                | `string`      | ✅       |                |
| middleName              | `string`      |          |                |
| dateOfBirth             | `ISO 8601`    | ✅       |                |
| gender                  | `enum`        | ✅       | male/female/other |
| nationalId              | `string`      |          |                |
| passportNumber          | `string`      |          |                |
| phone                   | `string`      |          |                |
| email                   | `string`      |          |                |
| address                 | `string`      |          |                |
| city                    | `string`      |          |                |
| country                 | `string`      |          |                |
| emergencyContactName    | `string`      |          |                |
| emergencyContactPhone   | `string`      |          |                |
| emergencyContactRelation| `string`      |          |                |
| bloodType               | `enum`        |          |                |
| allergies               | `string[]`    | ✅       |                |
| chronicConditions       | `string[]`    | ✅       |                |
| currentMedications      | `string[]`    | ✅       |                |
| insuranceProvider       | `string`      |          |                |
| insuranceNumber         | `string`      |          |                |
| patientNumber           | `string` (UQ) | ✅       | Auto-generated |
| registrationDate        | `ISO 8601`    | ✅       |                |
| lastVisit               | `ISO 8601`    |          |                |
| status                  | `enum`        | ✅       | active/inactive/deceased |
| notes                   | `string`      |          |                |
| createdAt               | `ISO 8601`    | ✅       |                |
| updatedAt               | `ISO 8601`    |          |                |
| metadata                | `JSON`        |          |                |

---

## Key Relationships Summary

| From              | To                | Cardinality | Via / FK                          |
|-------------------|-------------------|-------------|-----------------------------------|
| Organization      | License           | 1 : N       | `License.organizationId`          |
| Organization      | User              | 1 : N       | `User.organizationId`             |
| Organization      | Hospital          | 1 : N       | `Hospital.organizationId`         |
| Organization      | Pharmacy          | 1 : N       | `Pharmacy.organizationId`         |
| Organization      | Supplier          | 1 : N       | `Supplier.organizationId`         |
| Organization      | Product           | 1 : N       | `Product.organizationId`          |
| User ↔ License    | UserModuleAccess  | N : M       | Bridge table                      |
| Supplier          | Product           | 1 : N       | `Product.primarySupplierId`       |
| Supplier          | PurchaseOrder     | 1 : N       | `PurchaseOrder.supplierId`        |
| Product           | InventoryItem     | 1 : N       | `InventoryItem.productId`         |
| Product           | InventoryBatch    | 1 : N       | `InventoryBatch.productId`        |
| InventoryItem     | InventoryBatch    | 1 : N       | `InventoryBatch.inventoryItemId`  |
| InventoryItem     | StockMovement     | 1 : N       | `StockMovement.inventoryItemId`   |
| InventoryItem     | InventoryAlert    | 1 : N       | `InventoryAlert.inventoryItemId`  |
| PurchaseOrder     | PurchaseOrderItem | 1 : N       | `PurchaseOrderItem.purchaseOrderId` |
| StockCount        | StockCountItem    | 1 : N       | `StockCountItem.stockCountId`     |

---

## Test Data (Seeded on First Run)

| Entity           | Key / Name                        | Notes                              |
|------------------|-----------------------------------|------------------------------------|
| Organization     | HK Healthcare Group               | Kinshasa, RD Congo                 |
| License (TRIAL)  | `TRIAL-HK2024XY-Z9M3`            | 30 days, 3 users, all features     |
| License (PHARMACY)| `PHARMACY-PH2024XY-M9N3`        | 1 year, 10 users, Professional     |
| License (HOSPITAL)| `HOSPITAL-HP2024XY-B6C4`        | 1 year, 20 users, Professional     |
| License (COMBINED)| `COMBINED-CB2024XY-K7L2`        | 1 year, 50 users, Enterprise       |
| User (admin)     | phone: `admin` / pw: `admin123`   | Full trial access                  |
| Supplier 1       | PharmaCongo SARL                   | Kinshasa, NET_30                   |
| Supplier 2       | MedSupply International            | Lubumbashi, NET_15                 |
| Products (5)     | Amoxicilline, Paracétamol, Metformine, Sérum Physio, Gants | Various categories |
| Inventory        | Random stock + 2 batches per product | FEFO tracking                   |
| Alerts           | Low-stock + expiring-soon          | Auto-generated from stock data     |
