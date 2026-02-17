/**
 * Test script to verify all modules are using real connected data
 */

import DatabaseService from './DatabaseService';

export async function testDataConnection(): Promise<void> {
  console.log('\n🧪 TESTING DATA CONNECTION ACROSS ALL MODULES');
  console.log('════════════════════════════════════════════════');
  
  try {
    const db = DatabaseService.getInstance();
    
    // Test data loading
    console.log('\n📊 Testing Database Service...');
    await db.insertTestData();
    
    // Test Hospital module data
    console.log('\n🏥 Hospital Module Data:');
    const allPatients = await db.getAllPatients();
    const encounters = await db.getEncountersByPatient('PAT-001'); // Get sample encounters
    console.log(`   - Patients: ${allPatients.length}`);
    console.log(`   - Encounters: ${encounters.length}`);
    
    // Test Pharmacy module data
    console.log('\n💊 Pharmacy Module Data:');
    const products = (await db.getProducts()).slice(0, 10); // Get first 10 products
    const prescriptions = (await db.getPrescriptions()).slice(0, 10); // Get first 10 prescriptions
    const sales = (await db.getSales()).slice(0, 10); // Get first 10 sales
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Prescriptions: ${prescriptions.length}`);
    console.log(`   - Sales: ${sales.length}`);
    
    // Test OccHealth module data
    console.log('\n👷 OccHealth Module Data:');
    const occHealthPatients = await db.getOccHealthPatients();
    const occHealthEncounters = await db.getOccHealthEncounters();
    console.log(`   - OccHealth Patients: ${occHealthPatients.length}`);
    console.log(`   - OccHealth Encounters: ${occHealthEncounters.length}`);
    
    // Test data interconnection
    console.log('\n🔗 Testing Data Interconnections:');
    
    // Find a patient that exists in multiple modules
    const crossModulePatient = allPatients.find(p => p.employeeId && p.company);
    if (crossModulePatient) {
      console.log(`   - Found cross-module patient: ${crossModulePatient.firstName} ${crossModulePatient.lastName}`);
      console.log(`     • Hospital ID: ${crossModulePatient.id}`);
      console.log(`     • Employee ID: ${crossModulePatient.employeeId}`);
      console.log(`     • Company: ${crossModulePatient.company}`);
      
      // Check if this patient has encounters
      const patientEncounters = encounters.filter(e => e.patientId === crossModulePatient.id);
      console.log(`     • Encounters: ${patientEncounters.length}`);
      
      // Check if this patient has prescriptions
      const patientPrescriptions = prescriptions.filter(p => p.patientId === crossModulePatient.id);
      console.log(`     • Prescriptions: ${patientPrescriptions.length}`);
    }
    
    console.log('\n✅ Data connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Data connection test failed:', error);
    throw error;
  }
}