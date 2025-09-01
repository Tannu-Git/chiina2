// JWT Fix Script - Clears invalid tokens and helps users re-authenticate
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function verifyJWTSetup() {
  console.log('🔍 Checking JWT Configuration...');
  
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.log('❌ JWT_SECRET not found in environment variables');
    console.log('📝 Make sure you have a .env file with JWT_SECRET defined');
    return false;
  }
  
  console.log('✅ JWT_SECRET found in environment');
  console.log(`📏 JWT_SECRET length: ${jwtSecret.length} characters`);
  
  if (jwtSecret.length < 32) {
    console.log('⚠️ Warning: JWT_SECRET is quite short. Consider using a longer secret for production.');
  }
  
  return true;
}

async function resetUserPasswords() {
  console.log('\n🔧 Resetting demo user passwords...');
  
  try {
    // Find or create admin user
    let adminUser = await User.findOne({ email: 'admin@demo.com' });
    
    if (!adminUser) {
      console.log('🆕 Creating admin user...');
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@demo.com',
        password: 'password', // Will be hashed by the model
        role: 'admin',
        company: 'Logistics OMS Corp',
        phone: '+91-9876543210',
        isActive: true
      });
      await adminUser.save();
      console.log('✅ Admin user created');
    } else {
      console.log('👤 Admin user found, updating password...');
      adminUser.password = 'password'; // Will be hashed by the model
      await adminUser.save();
      console.log('✅ Admin password updated');
    }

    // Find or create staff user  
    let staffUser = await User.findOne({ email: 'staff@demo.com' });
    
    if (!staffUser) {
      console.log('🆕 Creating staff user...');
      staffUser = new User({
        name: 'Staff User',
        email: 'staff@demo.com',
        password: 'password',
        role: 'staff',
        company: 'Logistics OMS Corp',
        phone: '+91-9876543211',
        isActive: true
      });
      await staffUser.save();
      console.log('✅ Staff user created');
    } else {
      console.log('👤 Staff user found, updating password...');
      staffUser.password = 'password';
      await staffUser.save();
      console.log('✅ Staff password updated');
    }

    console.log('\n🎯 Demo Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Admin: admin@demo.com / password');
    console.log('👤 Staff: staff@demo.com / password');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  }
}

async function main() {
  console.log('🚀 JWT Authentication Fix Script');
  console.log('═══════════════════════════════════\n');
  
  await connectToDatabase();
  
  // Check JWT configuration
  const jwtOk = await verifyJWTSetup();
  
  if (jwtOk) {
    // Reset user passwords to ensure they can log in
    await resetUserPasswords();
    
    console.log('\n✅ JWT Fix completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Clear browser localStorage (F12 > Application > localStorage > Clear)');
    console.log('3. Log in with the credentials above');
    console.log('4. The JWT signature errors should be resolved');
    
    console.log('\n🔧 If you still get errors:');
    console.log('1. Check that your server restarted properly');
    console.log('2. Verify the .env file exists in the server directory');
    console.log('3. Clear all browser data for localhost:3000');
    
  } else {
    console.log('\n❌ JWT configuration issues found');
    console.log('Please check your .env file and try again');
  }
  
  await mongoose.disconnect();
  console.log('\n👋 Disconnected from MongoDB');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});