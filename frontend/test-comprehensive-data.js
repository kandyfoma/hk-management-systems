// Quick test script to verify comprehensive data setup
import { COMPREHENSIVE_PATIENTS } from './src/data/comprehensiveSeedData.ts';
import DatabaseService from './src/services/DatabaseService.ts';

async function testComprehensiveData() {
  console.log('🔍 Testing Comprehensive Data Setup...\n');
  
  // Test 1: Verify seed data structure
  console.log(`📊 Seed Data Summary:`);
  console.log(`- Total Patients: ${COMPREHENSIVE_PATIENTS.length}`);
  console.log(`- Hospital Patients: ${COMPREHENSIVE_PATIENTS.filter(p => p.patientType === 'hospital').length}`);
  console.log(`- OccHealth Patients: ${COMPREHENSIVE_PATIENTS.filter(p => p.patientType === 'occhealth').length}`);
  
  // Test 2: Verify DatabaseService integration
  const db = DatabaseService.getInstance();
  await db.loadComprehensiveData();
  
  const patients = db.getAllPatients();
  const prescriptions = db.getAllPrescriptions();
  const sales = db.getAllSales();
  const occHealthPatients = db.getOccHealthPatients();
  
  console.log(`\n💾 DatabaseService Data:`);
  console.log(`- Loaded Patients: ${patients.length}`);
  console.log(`- Loaded Prescriptions: ${prescriptions.length}`);
  console.log(`- Loaded Sales: ${sales.length}`);
  console.log(`- Loaded OccHealth Patients: ${occHealthPatients.length}`);
  
  // Test 3: Cross-module relationships
  console.log(`\n🔗 Cross-Module Relationships:`);
  const patientWithPrescriptions = patients.find(p => 
    prescriptions.some(pr => pr.patientId === p.id)
  );
  
  if (patientWithPrescriptions) {
    const patientPrescriptions = prescriptions.filter(pr => pr.patientId === patientWithPrescriptions.id);
    const relatedSales = sales.filter(s => 
      patientPrescriptions.some(pr => pr.id === s.prescriptionId)
    );
    
    console.log(`- Patient "${patientWithPrescriptions.firstName} ${patientWithPrescriptions.lastName}":`);
    console.log(`  • Has ${patientPrescriptions.length} prescriptions`);
    console.log(`  • Related to ${relatedSales.length} pharmacy sales`);
    
    if (patientWithPrescriptions.employeeId) {
      const occWorker = occHealthPatients.find(w => w.employeeId === patientWithPrescriptions.employeeId);
      if (occWorker) {
        console.log(`  • Also registered as OccHealth worker: ${occWorker.company} (${occWorker.sector})`);
      }
    }
  }
  
  console.log(`\n✅ Comprehensive data setup verification complete!`);
}

testComprehensiveData().catch(console.error);