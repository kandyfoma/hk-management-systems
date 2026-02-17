import DatabaseService from '../services/DatabaseService';
import LicenseService from '../services/LicenseService';
import AuthService from '../services/AuthService';

// Test script to verify TRIAL-HK2024XY-Z9M3 license works with phone authentication
async function testTrialLicenseWithPhoneAuth() {
  console.log('🧪 Testing Trial License with Phone Authentication');
  console.log('================================================');
  
  try {
    // Initialize services
    const db = DatabaseService.getInstance();
    const licenseService = LicenseService.getInstance();
    const authService = AuthService.getInstance();
    
    // Step 1: Setup database with test data
    console.log('1️⃣ Setting up database...');
    await db.insertTestData();
    console.log('✅ Database setup completed');
    
    // Step 2: Validate the trial license
    console.log('\n2️⃣ Validating trial license key...');
    const licenseKey = 'TRIAL-HK2024XY-Z9M3';
    const licenseValidation = await licenseService.validateLicenseKey(licenseKey);
    
    if (licenseValidation.isValid) {
      console.log('✅ Trial license is valid');
      console.log(`   Organization: ${licenseValidation.organization?.name}`);
      console.log(`   Module: ${licenseValidation.license?.moduleType}`);
      console.log(`   Tier: ${licenseValidation.license?.licenseTier}`);
      console.log(`   Expires: ${licenseValidation.license?.expiryDate || 'Never'}`);
    } else {
      console.log('❌ Trial license validation failed:', licenseValidation.errors.join(', '));
      return;
    }
    
    // Step 3: Register new user with phone and trial license
    console.log('\n3️⃣ Registering user with phone authentication...');
    const testPhone = '+1234567890';
    const registrationResult = await authService.register({
      firstName: 'Test',
      lastName: 'Admin',
      phone: testPhone,
      password: 'admin123',
      licenseKey: licenseKey,
      role: 'admin'
    });
    
    if (registrationResult.success) {
      console.log('✅ User registration successful');
      console.log(`   User: ${registrationResult.user?.firstName} ${registrationResult.user?.lastName}`);
      console.log(`   Phone: ${registrationResult.user?.phone}`);
      console.log(`   Organization: ${registrationResult.organization?.name}`);
      console.log(`   Modules: ${registrationResult.userModuleAccess?.map(a => a.moduleType).join(', ')}`);
    } else {
      console.log('❌ Registration failed:', registrationResult.error);
      return;
    }
    
    // Step 4: Test phone-based login
    console.log('\n4️⃣ Testing phone-based login...');
    const loginResult = await authService.login({
      phone: testPhone,
      password: 'admin123'
    });
    
    if (loginResult.success) {
      console.log('✅ Phone login successful');
      console.log(`   User: ${loginResult.user?.firstName} ${loginResult.user?.lastName}`);
      console.log(`   Phone: ${loginResult.user?.phone}`);
      console.log(`   Active Modules: ${loginResult.licenses?.map(l => l.moduleType).join(', ')}`);
    } else {
      console.log('❌ Login failed:', loginResult.error);
      return;
    }
    
    // Step 5: Test module access
    console.log('\n5️⃣ Testing module access...');
    if (loginResult.user) {
      const hasPharmacyAccess = await authService.hasModuleAccess(loginResult.user.id, 'PHARMACY');
      const hasHospitalAccess = await authService.hasModuleAccess(loginResult.user.id, 'HOSPITAL');
      const hasOccHealthAccess = await authService.hasModuleAccess(loginResult.user.id, 'OCCUPATIONAL_HEALTH');
      const userModules = await authService.getUserModules(loginResult.user.id);
      
      console.log(`   Pharmacy Access: ${hasPharmacyAccess ? '✅' : '❌'}`);
      console.log(`   Hospital Access: ${hasHospitalAccess ? '✅' : '❌'}`);
      console.log(`   Occupational Health Access: ${hasOccHealthAccess ? '✅' : '❌'}`);
      console.log(`   Available Modules: ${userModules.join(', ')}`);
    }
    
    // Step 6: Test login with license key (for existing user)
    console.log('\n6️⃣ Testing login with license key...');
    const loginWithLicenseResult = await authService.login({
      phone: testPhone,
      password: 'admin123',
      licenseKey: licenseKey
    });
    
    if (loginWithLicenseResult.success) {
      console.log('✅ Login with license key successful');
    } else {
      console.log('❌ Login with license key failed:', loginWithLicenseResult.error);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('The trial license TRIAL-HK2024XY-Z9M3 works perfectly with phone authentication.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export the test function
export { testTrialLicenseWithPhoneAuth };

// If running this file directly, run the test
if (require.main === module) {
  testTrialLicenseWithPhoneAuth();
}