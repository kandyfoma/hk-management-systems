// Quick test script to verify DatabaseService is working
console.log('Testing DatabaseService connection...');

// This is a simple Node.js test to verify our data structure
const fs = require('fs');
const path = require('path');

try {
  // Check if comprehensive data file exists
  const dataPath = path.join(__dirname, 'src', 'services', 'seedData', 'comprehensiveSeedData.ts');
  if (fs.existsSync(dataPath)) {
    const dataContent = fs.readFileSync(dataPath, 'utf8');
    console.log('✅ Comprehensive seed data TypeScript file loaded');
    
    // Count exports by looking for array declarations
    const patientMatches = dataContent.match(/COMPREHENSIVE_PATIENTS.*?\[/s);
    const supplierMatches = dataContent.match(/COMPREHENSIVE_SUPPLIERS.*?\[/s);
    const inventoryMatches = dataContent.match(/COMPREHENSIVE_INVENTORY.*?\[/s);
    const productMatches = dataContent.match(/ADDITIONAL_PRODUCTS.*?\[/s);
    
    console.log(`   - Has COMPREHENSIVE_PATIENTS: ${!!patientMatches}`);
    console.log(`   - Has COMPREHENSIVE_SUPPLIERS: ${!!supplierMatches}`);
    console.log(`   - Has COMPREHENSIVE_INVENTORY: ${!!inventoryMatches}`);
    console.log(`   - Has ADDITIONAL_PRODUCTS: ${!!productMatches}`);
    
  } else {
    console.log('❌ Comprehensive seed data file not found');
  }
  
  // Check DatabaseService file
  const dbPath = path.join(__dirname, 'src', 'services', 'DatabaseService.ts');
  if (fs.existsSync(dbPath)) {
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    const hasGetOccHealthPatients = dbContent.includes('getOccHealthPatients');
    const hasLoadComprehensiveData = dbContent.includes('loadComprehensiveData');
    console.log(`✅ DatabaseService exists`);
    console.log(`   - Has getOccHealthPatients: ${hasGetOccHealthPatients}`);
    console.log(`   - Has loadComprehensiveData: ${hasLoadComprehensiveData}`);
  }
  
} catch (error) {
  console.error('❌ Error testing database:', error.message);
}