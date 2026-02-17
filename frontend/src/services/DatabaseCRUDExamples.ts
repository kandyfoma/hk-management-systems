// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS USAGE EXAMPLES FOR DatabaseService
// ═══════════════════════════════════════════════════════════════

import DatabaseService from './DatabaseService';

class DatabaseCRUDExamples {
  private dbService = DatabaseService.getInstance();

  // ─── PATIENT OPERATIONS ──────────────────────────────────────

  async createNewPatient() {
    const newPatient = await this.dbService.createPatient({
      firstName: 'Jean',
      lastName: 'Kabongo',
      dateOfBirth: '1985-05-15',
      gender: 'male',
      phone: '+243 81 123 4567',
      email: 'jean.kabongo@example.cd',
      address: 'Avenue Kasavubu 123, Kinshasa',
      emergencyContactName: 'Marie Kabongo',
      emergencyContactPhone: '+243 99 876 5432',
      emergencyContactRelation: 'spouse',
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      status: 'active'
    });
    
    console.log('Created patient:', newPatient.id);
    return newPatient;
  }

  async updatePatientInfo(patientId: string) {
    const updated = await this.dbService.updatePatient(patientId, {
      phone: '+243 81 999 8888',
      address: 'New address updated',
      weight: 75,
      height: 180
    });
    
    console.log('Patient updated:', updated?.id);
    return updated;
  }

  // ─── PRODUCT OPERATIONS ───────────────────────────────────────

  async createNewProduct() {
    const newProduct = await this.dbService.createProduct({
      organizationId: 'ORG-001',
      name: 'Aspirine 500mg',
      genericName: 'Aspirine',
      sku: 'ASP-500-001',
      category: 'MEDICATION',
      dosageForm: 'TABLET',
      unitOfMeasure: 'TABLET',
      packSize: 1,
      activeIngredients: ['Acetylsalicylic acid'],
      manufacturer: 'Pharma Inc',
      costPrice: 0.45,
      sellingPrice: 0.75,
      currency: 'USD',
      taxRate: 0,
      controlledSubstance: false,
      requiresPrescription: true,
      insuranceReimbursable: false,
      reorderLevel: 10,
      reorderQuantity: 50,
      minStockLevel: 5,
      maxStockLevel: 500,
      safetyStockDays: 7
    });

    console.log('Created product:', newProduct.id);
    return newProduct;
  }

  async updateProductPrice(productId: string, newPrice: number) {
    const updated = await this.dbService.updateProduct(productId, {
      sellingPrice: newPrice,
      updatedAt: new Date().toISOString()
    });

    console.log('Product price updated:', updated?.sellingPrice);
    return updated;
  }

  // ─── INVENTORY OPERATIONS ─────────────────────────────────────

  async createInventoryItem(productId: string) {
    const inventoryItem = await this.dbService.createInventoryItem({
      organizationId: 'ORG-001',
      productId,
      facilityId: 'FAC-001',
      facilityType: 'PHARMACY',
      quantityOnHand: 100,
      quantityReserved: 0,
      quantityAvailable: 100,
      quantityOnOrder: 0,
      quantityDamaged: 0,
      quantityExpired: 0,
      averageCost: 0.45,
      totalStockValue: 45,
      lastPurchasePrice: 0.45,
      averageDailyUsage: 0,
      daysOfStockRemaining: 0,
      status: 'IN_STOCK'
    });

    console.log('Created inventory item:', inventoryItem.id);
    return inventoryItem;
  }

  async updateStockLevel(inventoryId: string, newStock: number) {
    const updated = await this.dbService.updateInventoryItem(inventoryId, {
      quantityOnHand: newStock,
      quantityAvailable: newStock,
      updatedAt: new Date().toISOString()
    });

    console.log('Stock level updated:', updated?.quantityOnHand);
    return updated;
  }

  // ─── PRESCRIPTION OPERATIONS ──────────────────────────────────

  async createPrescriptionFromEncounter(patientId: string, encounterId: string) {
    const prescription = await this.dbService.createPrescription({
      patientId,
      encounterId,
      doctorId: 'DOC-001',
      organizationId: 'ORG-001',
      facilityId: 'FAC-001',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      instructions: 'Traitement hypertension',
      allergiesChecked: true,
      interactionsChecked: true,
      items: [
        {
          id: 'ITEM-001',
          prescriptionId: '',
          medicationName: 'Amlodipine 5mg',
          dosage: '5mg',
          frequency: 'once_daily',
          duration: '30 jours',
          quantity: 30,
          quantityDispensed: 0,
          quantityRemaining: 30,
          route: 'oral',
          instructions: 'Prendre 1 comprimé le matin',
          isSubstitutionAllowed: false,
          isControlled: false,
          requiresCounseling: false,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]
    });

    console.log('Created prescription:', prescription.id);
    return prescription;
  }

  // ─── SALES OPERATIONS ─────────────────────────────────────────

  async createSaleTransaction(customerId: string) {
    const sale = await this.dbService.createSale({
      organizationId: 'ORG-001',
      facilityId: 'FAC-001',
      saleNumber: `VNT-${Date.now()}`,
      receiptNumber: `F-${Date.now()}`,
      type: 'COUNTER',
      customerId,
      customerName: 'Jean Kabongo',
      items: [
        {
          id: 'ITEM-001',
          saleId: '',
          productId: 'PROD-001',
          productName: 'Paracétamol 1000mg',
          productSku: 'PARA-1000',
          requiresPrescription: false,
          quantity: 2,
          returnedQuantity: 0,
          unitPrice: 1.50,
          costPrice: 1.00,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          lineTotal: 3.00
        }
      ],
      itemCount: 1,
      totalQuantity: 2,
      subtotal: 3.00,
      discountType: 'NONE',
      discountValue: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 3.00,
      currency: 'USD',
      payments: [{
        id: 'PAY-001',
        saleId: '',
        method: 'CASH',
        amount: 3.00,
        receivedAt: new Date().toISOString()
      }],
      totalPaid: 3.00,
      changeGiven: 0,
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      cashierId: 'CASHIER-001',
      cashierName: 'Pharm. Tshiala',
      accessCount: 0,
      receiptPrinted: false,
      printCount: 0
    });

    console.log('Created sale:', sale.id);
    return sale;
  }

  // ─── SEARCH & BATCH OPERATIONS ────────────────────────────────

  async searchPatients(query: string) {
    const results = await this.dbService.searchPatients(query);
    console.log('Search results:', results.length, 'patients found');
    return results;
  }

  async createMultiplePatients() {
    const patients = [
      {
        firstName: 'Marie',
        lastName: 'Tshimanga',
        dateOfBirth: '1990-08-20',
        gender: 'female' as const,
        phone: '+243 82 111 2222',
        email: 'marie.t@example.cd',
        allergies: [],
        chronicConditions: [],
        currentMedications: [],
        status: 'active' as const
      },
      {
        firstName: 'Paul',
        lastName: 'Mukendi',
        dateOfBirth: '1988-12-10',
        gender: 'male' as const,
        phone: '+243 85 333 4444',
        email: 'paul.m@example.cd',
        allergies: [],
        chronicConditions: [],
        currentMedications: [],
        status: 'active' as const
      }
    ];

    // Create patients individually since batch method doesn't exist
    const created = [];
    for (const patientData of patients) {
      const patient = await this.dbService.createPatient(patientData);
      created.push(patient);
    }
    
    console.log('Created patients:', created.length, 'patients');
    return created;
  }

  // ─── DATA MANAGEMENT OPERATIONS ───────────────────────────────

  async getSystemStats() {
    const patientStats = await this.dbService.getPatientStats();
    console.log('Patient statistics:', patientStats);
    return patientStats;
  }

  async exportAllSystemData() {
    // Export functionality would need to be implemented
    const exportData = {
      exportDate: new Date().toISOString(),
      patients: await this.dbService.getAllPatients(),
      // Add other data as needed
    };
    console.log('Export completed:', exportData.exportDate);
    return exportData;
  }

  // ─── COMPLETE WORKFLOW EXAMPLE ────────────────────────────────

  async completePatientWorkflow() {
    console.log('🏥 Starting complete patient workflow...');

    // 1. Create patient
    const patient = await this.createNewPatient();

    // 2. Create encounter
    const encounter = await this.dbService.createEncounter({
      patientId: patient.id,
      organizationId: 'ORG-001',
      facilityId: 'FAC-001',
      type: 'consultation',
      status: 'registered',
      arrivalDate: new Date().toISOString(),
      chiefComplaint: 'Hypertension de suivi',
      priority: 'routine',
      assessment: 'Hypertension stable sous traitement',
      plan: 'Continuer Amlodipine, contrôle dans 3 mois'
    });

    // 3. Create prescription
    const prescription = await this.createPrescriptionFromEncounter(
      patient.id, 
      encounter.id
    );

    // 4. Create sale for dispensing
    const sale = await this.createSaleTransaction(patient.id);

    // 5. Update prescription as dispensed
    await this.dbService.updatePrescription(prescription.id, {
      status: 'fully_dispensed'
    });

    console.log('✅ Complete workflow finished');
    return {
      patient: patient.id,
      encounter: encounter.id,
      prescription: prescription.id,
      sale: sale.id
    };
  }
}

export default DatabaseCRUDExamples;

// ═══════════════════════════════════════════════════════════════
// USAGE PATTERNS FOR DIFFERENT MODULES
// ═══════════════════════════════════════════════════════════════

/*

// HOSPITAL MODULE - Patient Registration & Encounters
const dbService = DatabaseService.getInstance();

// Register new patient
const patient = await dbService.createPatient({...patientData});

// Create medical encounter
const encounter = await dbService.createEncounter({
  patientId: patient.id,
  type: 'emergency',
  chiefComplaint: 'Patient complaint...'
});

// Update encounter with diagnosis
await dbService.updateEncounter(encounter.id, {
  assessment: 'Final diagnosis...',
  plan: 'Treatment plan...'
});

// PHARMACY MODULE - Inventory & Sales
// Add new product
const product = await dbService.createProduct({
  name: 'Medication Name',
  sku: 'MED-001',
  unitPrice: 5.00
});

// Create inventory item
const inventory = await dbService.createInventoryItem({
  productId: product.id,
  currentStock: 100,
  reorderPoint: 20
});

// Process sale
const sale = await dbService.createSale({
  customerId: patient.id,
  items: [{
    productId: product.id,
    quantity: 2,
    unitPrice: 5.00
  }],
  total: 10.00,
  paymentMethod: 'cash'
});

// OCCHEALTH MODULE - Employee Health Records
// Create OccHealth patient (worker)
const worker = await dbService.createPatient({
  firstName: 'John',
  lastName: 'Worker',
  employeeId: 'EMP-001',
  company: 'Mining Corp',
  jobTitle: 'Miner'
});

// Create occupational health exam
const exam = await dbService.createEncounter({
  patientId: worker.id,
  type: 'occupational_health_exam',
  chiefComplaint: 'Annual medical examination'
});

*/